const mongoose = require('mongoose');
const {
    CustomAIWorkflowJob_DefaultDB,
    N8nWorkflowJob_CustomAiDB
} = require('../models/N8nWorkflowJob');

const BotBase = require('../models/BotBase');
const BotService = require('./botService/BotService');
const Account = require('../models/Account');

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
    }

    try {
        const changeStream = N8nWorkflowJob_CustomAiDB.watch([{ $match: { operationType: 'insert' } }]);
        changeStream.on('change', async (next) => await processNewRecord(next.fullDocument));
        changeStream.on('error', () => startPollingFallback());
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
            for (const job of newJobs) {
                await processNewRecord(job);
                lastId = job._id;
            }
        } catch (err) { console.error('Polling Error:', err.message); }
    }, 5000);
}

async function processNewRecord(sourceDoc) {
    try {
        const requestId = sourceDoc.response?.requestID;
        const sourceId = sourceDoc._id.toString();

        // 1. Check for duplicates
        const exists = await CustomAIWorkflowJob_DefaultDB.findOne({
            'responsePayload.n8nSourceId': sourceId
        });
        if (exists) {
            console.log(`⚠️ Skipped Duplicate: ${requestId}`);
            return;
        }

        console.log(`✨ Processing New Record: ${requestId}`);

        // 2. Safely handle User ID (Convert string "14" to valid ObjectId or Null)
        let validUserId;
        try {
            validUserId = new mongoose.Types.ObjectId(sourceDoc.userId);
        } catch (e) {
            // If userId is "14" or invalid, assign to a default Admin/System ID
            // You should replace this string with a real User ID from your DB if possible
            validUserId = new mongoose.Types.ObjectId("000000000000000000000000");
        }

        const payloadToSave = {
            userId: validUserId,
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

        // --- 1. Find or Create a Valid Account ---
        let accountId;
        const userAccount = await Account.findOne({ userId: n8nJob.userId });

        if (userAccount) {
            accountId = userAccount._id;
        } else {
            // Create a dummy "N8N Paper" account so validation passes
            const newAccount = await Account.create({
                userId: n8nJob.userId,
                name: "N8N Auto Account",
                exchange: "n8n",
                active: true,
                isSimulation: true
            });
            accountId = newAccount._id;
            console.log(`⚠️ Created temp N8N Account: ${accountId}`);
        }

        const newBot = new BotBase({
            symbol: symbol,
            timeframe: timeframe,
            botType: "technical",
            active: true,
            name: botName,
            userId: n8nJob.userId,

            // --- FIXED: Account Info ---
            accountType: 'n8n',
            accountId: accountId,

            // --- FIXED: Risk Strategy Required ---
            riskStrategy: 'default',
            riskParams: {
                stopLossDistance: 0.02, // 2% default
                riskFraction: 0.01      // 1% risk
            },

            indicators: [
                {
                    name: "N8NBotRunner",
                    // --- FIXED: Timeframe Required ---
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
