const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const { Readable } = require('stream');

// Import connections and models
const customAiDbConnection = require('../../config/customAiDb');
const { N8nWorkflowJob_CustomAiDB, CustomAIWorkflowJob_DefaultDB } = require('../models/N8nWorkflowJob');
const { CustomAIJobResponse_DefaultDB } = require('../models/N8nJobResponse');

// --- Helpers (Same as before) ---
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

// --- POLLING LOGIC ---

// How often to check for new data (in milliseconds)
const POLL_INTERVAL = 5000;
let isPolling = false;

async function startN8nListener() {
    console.log('📡 [N8n Polling] Service started. Checking every 5 seconds...');

    // Ensure DB is connected
    if (customAiDbConnection.readyState !== 1) {
        await new Promise(resolve => customAiDbConnection.once('open', resolve));
    }

    // Start the interval loop
    setInterval(async () => {
        if (isPolling) return; // Prevent overlapping runs if processing takes > 5s
        isPolling = true;
        await checkNewJobs();
        isPolling = false;
    }, POLL_INTERVAL);
}

async function checkNewJobs() {
    try {
        // 1. Find all jobs with status 'pending'
        // We limit to 5 at a time to prevent memory spikes if there's a backlog
        const pendingJobs = await N8nWorkflowJob_CustomAiDB.find({ status: 'pending' })
            .sort({ createdAt: 1 }) // Process oldest first
            .limit(5);

        if (pendingJobs.length === 0) return;

        console.log(`⚡ [N8n Polling] Found ${pendingJobs.length} new pending jobs.`);

        for (const job of pendingJobs) {
            await processJob(job);
        }

    } catch (err) {
        console.error('❌ [N8n Polling] Error checking jobs:', err);
    }
}

async function processJob(n8nRecord) {
    console.log(`⚙️ Processing Job: ${n8nRecord._id}`);

    // Mark as 'processing' instantly so we don't pick it up again in the next poll
    n8nRecord.status = 'processing';
    await n8nRecord.save();

    try {
        const data = n8nRecord.response;

        // If data is missing or empty, mark failed
        if (!data || !data.requestID) {
            console.warn(`⚠️ Job ${n8nRecord._id} has no valid response data.`);
            n8nRecord.status = 'failed';
            n8nRecord.error = 'Missing response payload';
            await n8nRecord.save();
            return;
        }

        // --- 1. Find or Sync Parent Job ---
        // (Assuming you want to find a matching job in Main DB)
        let parentJob = await CustomAIWorkflowJob_DefaultDB.findOne({ _id: n8nRecord._id });

        if (!parentJob) {
            console.warn(`⚠️ Parent Job not found in Main DB. Skipping sync for ${n8nRecord._id}`);
            // We still mark n8n record as completed so we don't loop forever
            n8nRecord.status = 'completed';
            n8nRecord.error = 'Parent Job not found in DefaultDB';
            await n8nRecord.save();
            return;
        }

        // --- 2. Upload Files ---
        const codeFileId = await uploadToGridFS(data.generatedCode?.code, `code-${data.requestID}.js`);
        const svgFileId = await uploadToGridFS(cleanSvgString(data.backtest?.balanceSketch), `balance-${data.requestID}.svg`);

        // --- 3. Parse JSON strings ---
        let tradeLog = [];
        if (typeof data.backtest?.tradeLog === 'string') {
            try { tradeLog = JSON.parse(data.backtest.tradeLog); } catch(e) {}
        } else {
            tradeLog = data.backtest?.tradeLog || [];
        }

        // --- 4. Create Response in Main DB ---
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

        // --- 5. Finalize Parent & N8n Record ---

        // Update Main DB Job
        parentJob.status = 'completed';
        parentJob.response = savedResponse._id;
        await parentJob.save();

        // Update N8n DB Job
        n8nRecord.status = 'completed';
        await n8nRecord.save();

        console.log(`✅ Job ${n8nRecord._id} synced successfully.`);

    } catch (err) {
        console.error(`❌ Failed to process job ${n8nRecord._id}:`, err);
        // Mark as failed so we don't keep trying forever
        n8nRecord.status = 'failed';
        n8nRecord.error = err.message;
        await n8nRecord.save();
    }
}

module.exports = { startN8nListener };
