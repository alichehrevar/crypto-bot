const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const { Readable } = require('stream');

// Import your connections and models
const customAiDbConnection = require('../../config/customAiDb');

// Import Models
// Note: We use the _CustomAiDB version to listen, and _DefaultDB version to save
const { N8nWorkflowJob_CustomAiDB, CustomAIWorkflowJob_DefaultDB } = require('../models/N8nWorkflowJob');
const { CustomAIJobResponse_DefaultDB } = require('../models/N8nJobResponse');

// Helper to convert string to stream for GridFS
function stringToStream(string) {
    const stream = new Readable();
    stream.push(string);
    stream.push(null);
    return stream;
}

/**
 * Uploads content to GridFS on the Main DB connection
 * @param {string} content - The text content (code or SVG)
 * @param {string} filename - Name for the file
 * @returns {Promise<ObjectId>}
 */
async function uploadToGridFS(content, filename) {
    // Access the native MongoDB db object from the default Mongoose connection
    const db = mongoose.connection.db;
    const bucket = new GridFSBucket(db, { bucketName: 'n8n_blobs' }); // You can change bucketName

    return new Promise((resolve, reject) => {
        const uploadStream = bucket.openUploadStream(filename);
        const readStream = stringToStream(content);

        readStream.pipe(uploadStream)
            .on('error', reject)
            .on('finish', () => {
                resolve(uploadStream.id);
            });
    });
}

/**
 * Cleans the raw n8n SVG string (removes markdown backticks if present)
 */
function cleanSvgString(rawStr) {
    if (!rawStr) return '';
    // Remove ```svg and ``` at the end
    return rawStr.replace(/```svg/g, '').replace(/```/g, '').trim();
}

/**
 * Main Listener Function
 */
async function startN8nListener() {
    console.log('📡 [N8n Sync] Starting Change Stream Listener...');

    // 1. Ensure connections are ready
    if (mongoose.connection.readyState !== 1) {
        console.log('⏳ [N8n Sync] Waiting for Main DB connection...');
        await new Promise(resolve => mongoose.connection.once('connected', resolve));
    }

    // 2. Watch the n8n Workflow Job collection
    // We filter for 'insert' operations
    const pipeline = [{ $match: { operationType: 'insert' } }];
    const changeStream = N8nWorkflowJob_CustomAiDB.watch(pipeline);

    changeStream.on('change', async (next) => {
        try {
            console.log('⚡ [N8n Sync] New record detected from n8n DB');
            const n8nRecord = next.fullDocument;

            // The n8n JSON structure you provided puts the data inside a 'response' object
            const responseData = n8nRecord.response;

            if (!responseData) {
                console.warn('⚠️ [N8n Sync] Record has no response object, skipping.');
                return;
            }

            await processAndImportRecord(n8nRecord._id, responseData);

        } catch (err) {
            console.error('❌ [N8n Sync] Error processing change stream:', err);
        }
    });

    changeStream.on('error', (err) => {
        console.error('❌ [N8n Sync] Stream error:', err);
    });
}

/**
 * Processes the raw JSON and saves to Main DB
 */
async function processAndImportRecord(n8nOriginalId, data) {
    try {
        console.log(`⚙️ [N8n Sync] Processing Request ID: ${data.requestID}`);

        // 1. Find the Parent Job in Main DB
        // Assumption: The 'requestID' from n8n matches a reference or we link via the n8n _id.
        // If n8n created this record entirely new, we might need to find the job by other means.
        // For this example, we assume we need to link it to a Job.
        // If the Main DB Job doesn't exist yet, you might need to create it or skip.
        // HERE: We assume the 'requestID' or the n8nOriginalId helps us find the user/job.

        // *Logic Adjustment*: Since we need a valid 'jobId' (ObjectId) for the N8nJobResponseSchema,
        // and n8n just finished, we likely have a Pending job in Main DB.
        // If we can't find it, we might create a placeholder, but strictly the schema requires a ref.

        // For demonstration, I will search for a Main DB Job that might match or create a placeholder if valid.
        // specific logic depends on how you pass IDs to n8n.
        // Let's assume for now we look for a job with status 'processing' created by the user recently,
        // or we just use the n8nOriginalId if you synced IDs.

        // -- GRIDFS OPERATIONS --

        // A. Upload Generated Code
        let codeFileId = null;
        if (data.generatedCode && data.generatedCode.code) {
            codeFileId = await uploadToGridFS(
                data.generatedCode.code,
                `code-${data.requestID}.js`
            );
        }

        // B. Upload Balance Sketch SVG
        let svgFileId = null;
        if (data.backtest && data.backtest.balanceSketch) {
            const cleanSvg = cleanSvgString(data.backtest.balanceSketch);
            svgFileId = await uploadToGridFS(
                cleanSvg,
                `balance-${data.requestID}.svg`
            );
        }

        // -- PREPARE TRADELOG --
        let parsedTradeLog = [];
        if (data.backtest && data.backtest.tradeLog) {
            try {
                // The input shows tradeLog is a JSON string: "[{...}]"
                parsedTradeLog = typeof data.backtest.tradeLog === 'string'
                    ? JSON.parse(data.backtest.tradeLog)
                    : data.backtest.tradeLog;
            } catch (e) {
                console.error('Error parsing tradeLog JSON', e);
            }
        }

        // -- LOCATE PARENT JOB --
        // In a real scenario, you usually pass the MainDB Job ID to n8n as 'customId'
        // and n8n returns it in the response.
        // If not available, we need to fail or find a fallback.
        // checking if a job exists with this n8nOriginalId (if you synced IDs)
        let parentJob = await CustomAIWorkflowJob_DefaultDB.findOne({
            // Logic to find the parent.
            // If you don't send the ID to n8n, this is hard.
            // Assuming n8nOriginalId might be the link:
            _id: n8nOriginalId
        });

        if (!parentJob) {
            console.log('⚠️ Parent Job not found via ID. Creating a placeholder logic or skipping...');
            // For safety in this snippet, if no parent exists, we can't save Response because schema requires jobId.
            // You MUST ensure your n8n workflow passes back the original Job ID.
            return;
        }

        // -- CREATE MAIN DB RESPONSE --
        const newResponse = new CustomAIJobResponse_DefaultDB({
            jobId: parentJob._id,
            status: data.status,
            requestID: data.requestID,
            attempt: data.attempt,
            input: {
                originalPrompt: data.input?.originalPrompt,
                cleanedPrompt: data.input?.cleanedPrompt,
                experienceLevel: data.input?.experienceLevel,
                backtestSymbol: data.input?.backtestSymbol,
                backtestInterval: data.input?.backtestInterval,
            },
            modelUsed: "gpt-4o", // Or derive from data if available
            generatedCode: {
                summary: data.generatedCode?.summary,
                generatedCodeFileId: codeFileId, // GridFS ID
                fullCode: data.generatedCode?.code // Storing string as well per your schema
            },
            backtest: {
                status: data.backtest?.status,
                errorMessage: data.backtest?.errorMessage,
                roi: data.backtest?.roi,
                winRatio: data.backtest?.winRatio,
                simulatedTrades: data.backtest?.simulatedTrades,
                profitFactor: data.backtest?.profitFactor,
                sharpeRatio: data.backtest?.sharpeRatio,
                sortinoRatio: data.backtest?.sortinoRatio,
                maxDrawdown: data.backtest?.maxDrawdown,
                avgTradePnL: data.backtest?.avgTradePnL,
                avgDuration: data.backtest?.avgDuration,
                exposureTime: data.backtest?.exposureTime,
                tradeLog: parsedTradeLog,
                balanceSketchFileId: svgFileId, // GridFS ID
                fullBalanceSketch: cleanSvgString(data.backtest?.balanceSketch)
            },
            feedback: null
        });

        const savedResponse = await newResponse.save();
        console.log(`💾 [N8n Sync] Response saved! ID: ${savedResponse._id}`);

        // -- UPDATE PARENT JOB --
        parentJob.status = 'completed';
        parentJob.responsePayload = data; // Keep a copy of raw payload if desired
        parentJob.response = savedResponse._id; // Link the formatted response
        await parentJob.save();

        console.log('✅ [N8n Sync] Parent Job updated successfully.');

    } catch (err) {
        console.error('❌ [N8n Sync] Import Logic Failed:', err);
    }
}

module.exports = { startN8nListener };
