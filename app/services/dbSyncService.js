const mongoose = require('mongoose');
const {
    CustomAIWorkflowJob_DefaultDB,
    N8nWorkflowJob_CustomAiDB
} = require('../models/N8nWorkflowJob');

const customDbConnection = N8nWorkflowJob_CustomAiDB.db;

// We will track the last processed _id instead of time
let lastId = null;

async function syncImportedJobs() {
    console.log('🔄 Sync Service: Initializing...');

    // 1. Wait for connection
    if (customDbConnection.readyState !== 1) {
        await new Promise(resolve => customDbConnection.once('open', resolve));
        console.log('✅ Sync Service: CustomAiDB Connected!');
    }

    // 2. Initialize lastId to the absolute latest record in DB right now
    // We do this so we don't re-import old stuff on restart
    const latestDoc = await N8nWorkflowJob_CustomAiDB.findOne().sort({ _id: -1 });
    if (latestDoc) {
        lastId = latestDoc._id;
        console.log(`📍 Sync Service: Starting from ID ${lastId}`);
    } else {
        // If DB is empty, start from a dummy old ID
        lastId = new mongoose.Types.ObjectId("000000000000000000000000");
        console.log('📍 Sync Service: DB empty, listening for first record.');
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

        changeStream.on('error', (err) => {
            if (err.code === 40573 || err.code === 40571 || err.message.includes('replica set')) {
                console.warn('⚠️ MongoDB is not a Replica Set. Switching to POLLING mode.');
                changeStream.close();
                startPollingFallback();
            } else {
                console.error('❌ Change Stream Error:', err);
            }
        });

    } catch (error) {
        console.warn('⚠️ Change Stream failed to start. Switching to POLLING mode.');
        startPollingFallback();
    }
}

// --- POLLING FALLBACK (Reliable ID-based) ---
function startPollingFallback() {
    if (global.isPollingActive) return;
    global.isPollingActive = true;

    console.log('🕰️ Sync Service: Polling Mode Activated (ID-based, 5s interval).');

    setInterval(async () => {
        try {
            // Find records with _id GREATER THAN lastId
            // This works even if 'createdAt' is missing!
            const query = { _id: { $gt: lastId } };

            const newJobs = await N8nWorkflowJob_CustomAiDB.find(query)
                .sort({ _id: 1 }); // Process in order

            if (newJobs.length > 0) {
                console.log(`🔎 Polling: Found ${newJobs.length} new records.`);

                for (const job of newJobs) {
                    await processNewRecord(job);
                    // Update lastId to the one we just processed
                    lastId = job._id;
                }
            }
        } catch (err) {
            console.error('Polling Error:', err.message);
        }
    }, 5000);
}

// --- SHARED PROCESSING LOGIC ---
async function processNewRecord(sourceDoc) {
    try {
        // Prevent duplicates
        const exists = await CustomAIWorkflowJob_DefaultDB.findOne({
            'responsePayload.requestID': sourceDoc.response?.requestID
        });

        if (exists) return;

        // ⚠️ HANDLE MISSING DATA (N8N Raw Insert Protection)
        const payloadToSave = {
            userId: sourceDoc.userId || new mongoose.Types.ObjectId('000000000000000000000000'),
            type: sourceDoc.type || 'ai-model',
            status: 'completed',
            webhookPath: sourceDoc.webhookPath || 'imported-via-sync',

            // Map properly, adding safety checks (?)
            requestPayload: sourceDoc.response?.input || {},
            responsePayload: {
                generatedCode: sourceDoc.response?.generatedCode,
                backtest: sourceDoc.response?.backtest,
                status: sourceDoc.response?.status,
                requestID: sourceDoc.response?.requestID
            },

            error: sourceDoc.error || null,
            // If createdAt is missing from n8n, generate a new date
            createdAt: sourceDoc.createdAt || new Date()
        };

        const newDoc = await CustomAIWorkflowJob_DefaultDB.create(payloadToSave);
        console.log(`✅ Synced Record ID: ${newDoc._id}`);

    } catch (err) {
        console.error('❌ Error saving to Main DB:', err.message);
    }
}

module.exports = syncImportedJobs;
