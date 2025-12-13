const mongoose = require('mongoose');
const {
    CustomAIWorkflowJob_DefaultDB,
    N8nWorkflowJob_CustomAiDB
} = require('../models/N8nWorkflowJob');

// --- Imports for Auto-Deployment ---
// We need these to create the bot entry and register it live
const BotBase = require('../models/BotBase');
const BotService = require('./botService/BotService');

const customDbConnection = N8nWorkflowJob_CustomAiDB.db;

// We will track the last processed _id to avoid re-importing on restart
let lastId = null;

/**
 * Main Service Entry Point
 * Starts the Change Stream listener or falls back to polling.
 */
async function syncImportedJobs() {
    console.log('🔄 Sync Service: Initializing...');

    // 1. Wait for connection to the external N8n DB
    if (customDbConnection.readyState !== 1) {
        await new Promise(resolve => customDbConnection.once('open', resolve));
        console.log('✅ Sync Service: CustomAiDB Connected!');
    }

    // 2. Initialize lastId to the absolute latest record in DB right now
    const latestDoc = await N8nWorkflowJob_CustomAiDB.findOne().sort({ _id: -1 });
    if (latestDoc) {
        lastId = latestDoc._id;
        console.log(`📍 Sync Service: Starting from ID ${lastId}`);
    } else {
        lastId = new mongoose.Types.ObjectId("000000000000000000000000");
        console.log('📍 Sync Service: DB empty, listening for first record.');
    }

    // 3. Start Listening
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
            // Handle common error where Mongo isn't a Replica Set
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

/**
 * Polling Fallback
 * Used if Change Streams are not available. Checks every 5 seconds.
 */
function startPollingFallback() {
    if (global.isPollingActive) return;
    global.isPollingActive = true;

    console.log('🕰️ Sync Service: Polling Mode Activated (ID-based, 5s interval).');

    setInterval(async () => {
        try {
            // Find records with _id GREATER THAN lastId
            const query = { _id: { $gt: lastId } };

            const newJobs = await N8nWorkflowJob_CustomAiDB.find(query)
                .sort({ _id: 1 }); // Process in order

            if (newJobs.length > 0) {
                console.log(`🔎 Polling: Found ${newJobs.length} new records.`);

                for (const job of newJobs) {
                    await processNewRecord(job);
                    // Update lastId so we don't process this again
                    lastId = job._id;
                }
            }
        } catch (err) {
            console.error('Polling Error:', err.message);
        }
    }, 5000);
}

/**
 * Process a Single Record
 * 1. Checks for duplicates in Main DB.
 * 2. Copies data from N8n DB to Main DB.
 * 3. Triggers Auto-Deployment of the bot.
 */
async function processNewRecord(sourceDoc) {
    try {
        const requestId = sourceDoc.response?.requestID;
        const sourceId = sourceDoc._id.toString(); // The unique ID from N8n DB

        // 1. IMPROVED DUPLICATE CHECK
        // We check if we have already imported THIS specific N8n record ID.
        // We look for 'responsePayload.n8nSourceId' which we will save below.
        const exists = await CustomAIWorkflowJob_DefaultDB.findOne({
            'responsePayload.n8nSourceId': sourceId
        });

        if (exists) {
            console.log(`⚠️ Skipped Already Synced Record: ${sourceId} (RequestID: ${requestId})`);
            return;
        }

        console.log(`✨ Processing New Record: ${requestId} (Source ID: ${sourceId})`);

        // 2. Prepare payload for Main DB
        const payloadToSave = {
            userId: sourceDoc.userId || new mongoose.Types.ObjectId('000000000000000000000000'),
            type: sourceDoc.type || 'ai-model',
            status: 'completed',
            webhookPath: sourceDoc.webhookPath || 'imported-via-sync',

            requestPayload: sourceDoc.response?.input || {},

            responsePayload: {
                // SAVE THE SOURCE ID HERE so we can check it next time
                n8nSourceId: sourceId,

                generatedCode: sourceDoc.response?.generatedCode,
                backtest: sourceDoc.response?.backtest,
                status: sourceDoc.response?.status,
                requestID: requestId
            },

            error: sourceDoc.error || null,
            createdAt: sourceDoc.createdAt || new Date()
        };

        // 3. Save to Main DB
        const newDoc = await CustomAIWorkflowJob_DefaultDB.create(payloadToSave);
        console.log(`✅ Synced Record ID: ${newDoc._id}`);

        // 4. TRIGGER AUTO-DEPLOYMENT
        await autoDeployBot(newDoc);

    } catch (err) {
        console.error('❌ Error saving to Main DB:', err.message);
    }
}

/**
 * Auto Deploy Function
 * Creates a BotBase configuration and hot-loads it into the running BotService.
 */
async function autoDeployBot(n8nJob) {
    try {
        // Extract data to configure the bot
        // N8n usually returns these in the input payload
        const inputParams = n8nJob.requestPayload || {};

        // Fallback defaults if N8n didn't send them
        const symbol = inputParams.backtestSymbol || "BTC/USDT";
        const timeframe = inputParams.backtestInterval || "15m";
        const requestID = n8nJob.responsePayload?.requestID || Date.now();
        const botName = `AI-Bot-${requestID}`;

        console.log(`🚀 Auto-Deploying Bot: ${botName} for ${symbol} ${timeframe}`);

        // 1. Create the Bot Configuration in MongoDB
        const newBot = new BotBase({
            symbol: symbol,
            timeframe: timeframe,
            botType: "indicator",
            active: true, // Set to true to start immediately
            name: botName,
            accountType: 'n8n',
            accountId: requestID.split('-')[1],
            indicators: [
                {
                    name: "N8NBotRunner", // Matches the case in BotService.js
                    params: {
                        // CRITICAL: Link this bot to the Synced Code ID
                        jobId: n8nJob._id.toString(),
                        windowSize: 100 // Default param for the strategy
                    }
                }
            ],
            marketInfo: { lastSignal: "HOLD" },
            tradeInfo: { signalProcessingMethod: "consensus" }
        });

        const savedBot = await newBot.save();
        console.log(`💾 Bot Configuration Saved: ${savedBot._id}`);

        // 2. HOT RELOAD: Register with the live BotService immediately
        // This pushes the new bot into the active memory map without restarting the server
        BotService.registerBot(savedBot);
        console.log(`✅ Bot Registered in Live Engine!`);

    } catch (err) {
        console.error("❌ Auto-Deploy Failed:", err.message);
    }
}

module.exports = syncImportedJobs;
