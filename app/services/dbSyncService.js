const mongoose = require('mongoose');
const {
    CustomAIWorkflowJob_DefaultDB,
    N8nWorkflowJob_CustomAiDB
} = require('../models/N8nWorkflowJob');

// Access the underlying connection
const customDbConnection = N8nWorkflowJob_CustomAiDB.db;

async function syncImportedJobs() {
    console.log('🔄 Sync Service: Initializing...');

    // 1. Wait for connection if not ready
    if (customDbConnection.readyState !== 1) {
        console.log('⏳ Sync Service: Waiting for CustomAiDB connection...');
        await new Promise(resolve => customDbConnection.once('open', resolve));
        console.log('✅ Sync Service: CustomAiDB Connected!');
    }

    try {
        console.log('📡 Sync Service: Attempting to start Change Stream...');

        const changeStream = N8nWorkflowJob_CustomAiDB.watch(
            [{ $match: { operationType: 'insert' } }]
        );

        changeStream.on('change', async (next) => {
            console.log('⚡ Stream Event: New record detected!');
            await processNewRecord(next.fullDocument);
        });

        // 2. Catch "Not a Replica Set" errors here
        changeStream.on('error', (err) => {
            if (err.code === 40573 || err.code === 40571 || err.message.includes('replica set')) {
                console.warn('⚠️ MongoDB is not a Replica Set. Switching to POLLING mode.');
                changeStream.close(); // Close the broken stream
                startPollingFallback();
            } else {
                console.error('❌ Change Stream Error:', err);
            }
        });

        console.log('✅ Sync Service: Change Stream Listener Attached.');

    } catch (error) {
        // If .watch() throws synchronously
        console.warn('⚠️ Change Stream failed to start. Switching to POLLING mode.');
        startPollingFallback();
    }
}

// --- POLLING FALLBACK (For Local/Standalone Mongo) ---
let lastCheckTime = new Date();

function startPollingFallback() {
    // Prevent multiple pollers
    if (global.isPollingActive) return;
    global.isPollingActive = true;

    console.log('🕰️ Sync Service: Polling Mode Activated (Check every 5s).');

    setInterval(async () => {
        try {
            const newJobs = await N8nWorkflowJob_CustomAiDB.find({
                createdAt: { $gt: lastCheckTime }
            });

            if (newJobs.length > 0) {
                console.log(`🔎 Polling: Found ${newJobs.length} new records.`);
                for (const job of newJobs) {
                    await processNewRecord(job);
                }
                // Update time to the latest record found
                lastCheckTime = newJobs[newJobs.length - 1].createdAt;
            } else {
                // Advance time to now if nothing found, to ensure we don't scan old data
                lastCheckTime = new Date();
            }
        } catch (err) {
            console.error('Polling Error:', err.message);
        }
    }, 5000);
}

// --- SHARED PROCESSING LOGIC ---
async function processNewRecord(sourceDoc) {
    try {
        // Avoid duplicates
        const exists = await CustomAIWorkflowJob_DefaultDB.findOne({
            'responsePayload.requestID': sourceDoc.response?.requestID
        });

        if (exists) return;

        const payloadToSave = {
            userId: sourceDoc.userId || new mongoose.Types.ObjectId('000000000000000000000000'),
            type: sourceDoc.type || 'ai-model',
            status: 'completed',
            webhookPath: sourceDoc.webhookPath || 'imported-via-sync',
            requestPayload: sourceDoc.response?.input || {},
            responsePayload: {
                generatedCode: sourceDoc.response?.generatedCode,
                backtest: sourceDoc.response?.backtest,
                status: sourceDoc.response?.status,
                requestID: sourceDoc.response?.requestID
            },
            error: sourceDoc.error || null,
            createdAt: sourceDoc.createdAt
        };

        const newDoc = await CustomAIWorkflowJob_DefaultDB.create(payloadToSave);
        console.log(`✅ Synced Record ID: ${newDoc._id}`);

    } catch (err) {
        console.error('❌ Error saving to Main DB:', err.message);
    }
}

module.exports = syncImportedJobs;
