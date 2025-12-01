const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const { Readable } = require('stream');

// 1. Import the specific connection for the n8n DB
const customAiDbConnection = require('../../config/customAiDb');

// Import Models
const { N8nWorkflowJob_CustomAiDB, CustomAIWorkflowJob_DefaultDB } = require('../models/N8nWorkflowJob');
const { CustomAIJobResponse_DefaultDB } = require('../models/N8nJobResponse');

// --- Helpers ---

function stringToStream(string) {
    const stream = new Readable();
    stream.push(string);
    stream.push(null);
    return stream;
}

function cleanSvgString(rawStr) {
    if (!rawStr) return '';
    return rawStr.replace(/```svg/g, '').replace(/```/g, '').trim();
}

/**
 * Uploads content to GridFS on the MAIN DB (Default Connection)
 */
async function uploadToGridFS(content, filename) {
    const db = mongoose.connection.db; // Default Main DB
    const bucket = new GridFSBucket(db, { bucketName: 'n8n_blobs' });

    return new Promise((resolve, reject) => {
        const uploadStream = bucket.openUploadStream(filename);
        stringToStream(content).pipe(uploadStream)
            .on('error', reject)
            .on('finish', () => resolve(uploadStream.id));
    });
}

// --- Main Service ---

async function startN8nListener() {
    console.log('📡 [N8n Sync] Initializing Listener...');

    // 1. USE THE CONNECTION OBJECT: Wait for the n8n DB to be ready
    if (customAiDbConnection.readyState !== 1) {
        console.log('⏳ [N8n Sync] Waiting for Custom AI DB connection...');
        await new Promise(resolve => customAiDbConnection.once('open', resolve));
    }
    console.log('✅ [N8n Sync] Custom AI DB Connected. Starting Watcher.');

    // 2. Watch the n8n Workflow Job collection
    const pipeline = [{ $match: { operationType: 'insert' } }];

    // We listen specifically to the Model attached to the n8n DB
    const changeStream = N8nWorkflowJob_CustomAiDB.watch(pipeline);

    changeStream.on('change', async (next) => {
        try {
            const n8nRecord = next.fullDocument;

            // Basic validation to ensure it's the right data structure
            if (!n8nRecord.response || !n8nRecord.response.requestID) {
                return;
            }

            console.log(`⚡ [N8n Sync] Detected Insert: ${n8nRecord.response.requestID}`);
            await processAndImportRecord(n8nRecord._id, n8nRecord.response);

        } catch (err) {
            console.error('❌ [N8n Sync] Error in change stream:', err);
        }
    });

    changeStream.on('error', (err) => console.error('❌ [N8n Sync] Stream error:', err));
}

async function processAndImportRecord(n8nOriginalId, data) {
    try {
        // 1. Locate Parent Job in Main DB
        // NOTE: This assumes n8nOriginalId matches or you have a way to link them.
        // If n8n generates a completely new ID, you must pass the Main Job ID to n8n
        // as a 'customId' and retrieve it here from `data`.
        // For now, we search by ID:
        const parentJob = await CustomAIWorkflowJob_DefaultDB.findOne({ _id: n8nOriginalId });

        if (!parentJob) {
            console.warn(`⚠️ [N8n Sync] Parent Job not found for ID: ${n8nOriginalId}. Skipping.`);
            return;
        }

        // 2. Handle GridFS Uploads (Code & SVG)
        let codeFileId = null;
        if (data.generatedCode?.code) {
            codeFileId = await uploadToGridFS(data.generatedCode.code, `code-${data.requestID}.js`);
        }

        let svgFileId = null;
        if (data.backtest?.balanceSketch) {
            svgFileId = await uploadToGridFS(cleanSvgString(data.backtest.balanceSketch), `balance-${data.requestID}.svg`);
        }

        // 3. Parse TradeLog (it comes as a string)
        let tradeLog = [];
        if (typeof data.backtest?.tradeLog === 'string') {
            try { tradeLog = JSON.parse(data.backtest.tradeLog); } catch(e) {}
        } else if (Array.isArray(data.backtest?.tradeLog)) {
            tradeLog = data.backtest.tradeLog;
        }

        // 4. Create Response in Main DB
        const newResponse = new CustomAIJobResponse_DefaultDB({
            jobId: parentJob._id,
            status: data.status,
            requestID: data.requestID,
            attempt: data.attempt,
            input: data.input,
            modelUsed: "gpt-4o", // or data.modelUsed
            generatedCode: {
                summary: data.generatedCode?.summary,
                generatedCodeFileId: codeFileId,
                fullCode: data.generatedCode?.code
            },
            backtest: {
                ...data.backtest,
                tradeLog: tradeLog,
                balanceSketchFileId: svgFileId,
                fullBalanceSketch: cleanSvgString(data.backtest?.balanceSketch)
            }
        });

        const savedResponse = await newResponse.save();

        // 5. Update Parent Job
        parentJob.status = 'completed';
        parentJob.response = savedResponse._id;
        await parentJob.save();

        console.log(`💾 [N8n Sync] Imported successfully for Job ${parentJob._id}`);

    } catch (err) {
        console.error('❌ [N8n Sync] Import failed:', err);
    }
}

module.exports = { startN8nListener };
