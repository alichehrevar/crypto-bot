const mongoose = require('mongoose');
const {
    CustomAIWorkflowJob_DefaultDB,
    N8nWorkflowJob_CustomAiDB
} = require('../models/N8nWorkflowJob');

// Models required for deployment
const BotBase = require('../models/BotBase');
const BotService = require('./botService/BotService');
// We need Account model to find a valid accountId for the bot
const Account = require('../models/Account'); // Ensure this path is correct for your project

const customDbConnection = N8nWorkflowJob_CustomAiDB.db;
let lastId = null;

async function syncImportedJobs() {
    console.log('🔄 Sync Service: Initializing...');

    if (customDbConnection.readyState !== 1) {
        await new Promise(resolve => customDbConnection.once('open', resolve));
        console.log('✅ Sync Service: CustomAiDB Connected!');
    }

    const latestDoc = await N8nWorkflowJob_CustomAiDB.findOne().sort({ _id: -1 });
    if (latestDoc) {
        lastId = latestDoc._id;
        console.log(`📍 Sync Service: Starting from ID ${lastId}`);
    } else {
        lastId = new mongoose.Types.ObjectId("000000000000000000000000");
        console.log('📍 Sync Service: DB empty, listening for first record.');
    }

    try {
        const changeStream = N8nWorkflowJob_CustomAiDB.watch([{ $match: { operationType: 'insert' } }]);

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
        startPollingFallback();
    }
}

function startPollingFallback() {
    if (global.isPollingActive) return;
    global.isPollingActive = true;
    console.log('🕰️ Sync Service: Polling Mode Activated.');

    setInterval(async () => {
        try {
            const query = { _id: { $gt: lastId } };
            const newJobs = await N8nWorkflowJob_CustomAiDB.find(query).sort({ _id: 1 });

            if (newJobs.length > 0) {
                console.log(`🔎 Polling: Found ${newJobs.length} new records.`);
                for (const job of newJobs) {
                    await processNewRecord(job);
                    lastId = job._id;
                }
            }
        } catch (err) {
            console.error('Polling Error:', err.message);
        }
    }, 5000);
}

async function processNewRecord(sourceDoc) {
    try {
        const requestId = sourceDoc.response?.requestID;
        const sourceId = sourceDoc._id.toString();

        const exists = await CustomAIWorkflowJob_DefaultDB.findOne({
            'responsePayload.n8nSourceId': sourceId
        });

        if (exists) {
            console.log(`⚠️ Skipped Duplicate: ${requestId}`);
            return;
        }

        console.log(`✨ Syncing Record: ${requestId}`);

        const payloadToSave = {
            userId: sourceDoc.userId || new mongoose.Types.ObjectId('000000000000000000000000'),
            type: sourceDoc.type || 'ai-model',
            status: 'completed',
            webhookPath: sourceDoc.webhookPath || 'imported-via-sync',
            requestPayload: sourceDoc.response?.input || {},
            responsePayload: {
                n8nSourceId: sourceId,
                generatedCode: sourceDoc.response?.generatedCode,
                backtest: sourceDoc.response?.backtest,
                status: sourceDoc.response?.status,
                requestID: requestId
            },
            error: sourceDoc.error || null,
            createdAt: sourceDoc.createdAt || new Date()
        };

        const newDoc = await CustomAIWorkflowJob_DefaultDB.create(payloadToSave);
        console.log(`✅ Synced Record ID: ${newDoc._id}`);

        await autoDeployBot(newDoc);

    } catch (err) {
        console.error('❌ Error saving to Main DB:', err.message);
    }
}

async function autoDeployBot(n8nJob) {
    try {
        const inputParams = n8nJob.requestPayload || {};
        const symbol = inputParams.backtestSymbol || "BTC/USDT";
        const timeframe = inputParams.backtestInterval || "15m";
        const requestID = n8nJob.responsePayload?.requestID || Date.now();
        const botName = `AI-Bot-${requestID}`;

        console.log(`🚀 Auto-Deploying Bot: ${botName}...`);

        // --- FIX 1: Find a valid Account ID ---
        // Try to find an existing account for this user, or use a dummy valid ObjectId
        let accountId;
        const userAccount = await Account.findOne({ userId: n8nJob.userId });
        if (userAccount) {
            accountId = userAccount._id;
        } else {
            // Fallback: Generate a new valid ObjectId if no account found (prevents "Cast to ObjectId" error)
            accountId = new mongoose.Types.ObjectId();
            console.warn(`⚠️ No Account found for User. Using generated ID: ${accountId}`);
        }

        const newBot = new BotBase({
            symbol: symbol,
            timeframe: timeframe,
            botType: "technical",
            active: true,
            name: botName,

            // --- FIX 2: Add Account Info ---
            accountType: 'n8n',
            accountId: accountId,

            // --- FIX 3: Add Risk Strategy ---
            riskStrategy: 'default', // Required field

            indicators: [
                {
                    name: "N8NBotRunner",
                    // --- FIX 4: Add Timeframe to Indicator ---
                    timeframe: timeframe,
                    params: {
                        jobId: n8nJob._id.toString(),
                        windowSize: 100
                    }
                }
            ],
            marketInfo: { lastSignal: "HOLD" },
            tradeInfo: { signalProcessingMethod: "consensus" }
        });

        const savedBot = await newBot.save();
        console.log(`💾 Bot Saved: ${savedBot._id}`);

        BotService.registerBot(savedBot);
        console.log(`✅ Bot Registered Live!`);

    } catch (err) {
        console.error("❌ Auto-Deploy Failed:", err.message);
    }
}

module.exports = syncImportedJobs;
