const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const { Readable } = require('stream');

const customAiDbConnection = require('../../config/customAiDb');
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

async function uploadToGridFS(content, filename) {
    if (!content) return null;
    const db = mongoose.connection.db;
    const bucket = new GridFSBucket(db, { bucketName: 'n8n_blobs' });

    return new Promise((resolve, reject) => {
        const uploadStream = bucket.openUploadStream(filename);
        stringToStream(content).pipe(uploadStream)
            .on('error', reject)
            .on('finish', () => resolve(uploadStream.id));
    });
}

// --- DEBUG POLLING SERVICE ---

const POLL_INTERVAL = 5000;
let isPolling = false;

async function startN8nListener() {
    console.log('🔵 [N8n Debug] startN8nListener() called.');
    console.log(`🔵 [N8n Debug] Custom DB State: ${customAiDbConnection.readyState} (0=D/C, 1=Conn, 2=Conn-ing)`);

    // 1. Force wait for connection if not ready
    if (customAiDbConnection.readyState !== 1) {
        console.log('⏳ [N8n Debug] Waiting for Custom DB to open...');
        await new Promise(resolve => customAiDbConnection.once('open', resolve));
        console.log('✅ [N8n Debug] Custom DB Connected!');
    }

    // 2. DEBUG: Check which collection Mongoose is actually using
    const collectionName = N8nWorkflowJob_CustomAiDB.collection.name;
    console.log(`🔎 [N8n Debug] Mongoose is querying collection: "${collectionName}"`);

    // 3. DEBUG: Check total count in that collection (ignoring status)
    try {
        const totalCount = await N8nWorkflowJob_CustomAiDB.countDocuments({});
        console.log(`📊 [N8n Debug] Total documents in "${collectionName}": ${totalCount}`);

        if (totalCount === 0) {
            console.warn('⚠️ [N8n Debug] Collection is empty! Check if n8n is writing to a different collection name.');
        }
    } catch (err) {
        console.error('❌ [N8n Debug] Error counting docs:', err);
    }

    console.log('🟢 [N8n Debug] Starting Interval Loop...');

    setInterval(async () => {
        if (isPolling) return;
        isPolling = true;
        await checkNewJobs();
        isPolling = false;
    }, POLL_INTERVAL);
}

async function checkNewJobs() {
    try {
        // Query for 'pending' jobs
        const pendingJobs = await N8nWorkflowJob_CustomAiDB.find({ status: 'pending' })
            .sort({ createdAt: 1 })
            .limit(5);

        // Silent log if empty (to avoid spamming), but log if found
        if (pendingJobs.length > 0) {
            console.log(`⚡ [N8n Debug] Found ${pendingJobs.length} PENDING jobs.`);
            for (const job of pendingJobs) {
                await processJob(job);
            }
        }

    } catch (err) {
        console.error('❌ [N8n Debug] Error in polling loop:', err);
    }
}

async function processJob(n8nRecord) {
    console.log(`⚙️ [N8n Debug] Processing Record ID: ${n8nRecord._id}`);

    // Update status immediately
    n8nRecord.status = 'processing';
    await n8nRecord.save();

    try {
        const data = n8nRecord.response;

        if (!data || !data.requestID) {
            console.warn(`⚠️ [N8n Debug] Record ${n8nRecord._id} missing 'response.requestID'.`);
            n8nRecord.status = 'failed';
            n8nRecord.error = 'Missing response payload';
            await n8nRecord.save();
            return;
        }

        // Locate Parent Job
        let parentJob = await CustomAIWorkflowJob_DefaultDB.findOne({ _id: n8nRecord._id });

        if (!parentJob) {
            console.warn(`⚠️ [N8n Debug] Parent Job not found in Main DB (ID: ${n8nRecord._id}). Marking completed anyway.`);
            n8nRecord.status = 'completed';
            n8nRecord.error = 'Parent Job not found';
            await n8nRecord.save();
            return;
        }

        // Uploads
        console.log(`📤 [N8n Debug] Uploading files for ${data.requestID}...`);
        const codeFileId = await uploadToGridFS(data.generatedCode?.code, `code-${data.requestID}.js`);
        const svgFileId = await uploadToGridFS(cleanSvgString(data.backtest?.balanceSketch), `balance-${data.requestID}.svg`);

        // Parse Logic
        let tradeLog = [];
        if (typeof data.backtest?.tradeLog === 'string') {
            try { tradeLog = JSON.parse(data.backtest.tradeLog); } catch(e) {}
        } else {
            tradeLog = data.backtest?.tradeLog || [];
        }

        // Save Response
        const newResponse = new CustomAIJobResponse_DefaultDB({
            jobId: parentJob._id,
            status: data.status,
            requestID: data.requestID,
            attempt: data.attempt,
            input: data.input,
            modelUsed: "gpt-4o",
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

        parentJob.status = 'completed';
        parentJob.response = savedResponse._id;
        await parentJob.save();

        n8nRecord.status = 'completed';
        await n8nRecord.save();

        console.log(`✅ [N8n Debug] Job ${n8nRecord._id} Synced Successfully!`);

    } catch (err) {
        console.error(`❌ [N8n Debug] Failed to process ${n8nRecord._id}:`, err);
        n8nRecord.status = 'failed';
        n8nRecord.error = err.message;
        await n8nRecord.save();
    }
}

module.exports = { startN8nListener };
