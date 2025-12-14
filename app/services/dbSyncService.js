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

        // 1. Symbol Normalization (Match Manual Bot style if needed)
        // If input is "BTCUSDT" or "BTC/USDT", your system might prefer just "BTC" for BingX
        // For now, we default to standard "BTC/USDT" but you can strip it if needed.
        let symbol = inputParams.backtestSymbol || "BTC/USDT";
        const timeframe = inputParams.backtestInterval || "15m";
        const requestID = n8nJob.responsePayload?.requestID || Date.now();
        const botName = `AI-Bot-${requestID}`;

        console.log(`🚀 Auto-Deploying Bot: ${botName}...`);

        // 2. Find Real Account (Priority: BingX -> Binance -> Any)
        // We prefer a REAL account over creating a dummy one if possible
        let accountId;
        let accountType = 'n8n';

        // Try to find a real BingX or Binance account for this user
        const realAccount = await Account.findOne({
            userId: n8nJob.userId,
            exchange: { $in: ['bingx', 'binance', 'okx'] },
            active: true
        }).sort({ createdAt: -1 });

        if (realAccount) {
            accountId = realAccount._id;
            accountType = realAccount.exchange;
            console.log(`✅ Using Real Account: ${accountType} (${accountId})`);
        } else {
            // Fallback to N8N/Paper account
            let paperAccount = await Account.findOne({ userId: n8nJob.userId, exchange: 'n8n' });
            if (!paperAccount) {
                paperAccount = await Account.create({
                    userId: n8nJob.userId,
                    name: "N8N Auto Account",
                    exchange: "n8n",
                    active: true,
                    isSimulation: true
                });
            }
            accountId = paperAccount._id;
            console.log(`⚠️ Using Paper Account: ${accountId}`);
        }

        // 3. Create Bot with FULL Configuration
        const newBot = new BotBase({
            name: botName,
            symbol: symbol,
            timeframe: timeframe,
            userId: n8nJob.userId,
            active: true, // Start immediately
            mode: 'paper',

            // --- FIX 1: Match Manual Bot Type ---
            botType: "technical",

            // --- FIX 2: Real Account Linking ---
            accountType: accountType,
            accountId: accountId,

            // --- FIX 3: Robust Trade Info (Leverage, TP/SL) ---
            tradeInfo: {
                takeProfit: 10,  // Default 10% (Matches manual)
                stopLoss: 5,     // Default 5% (Safer default)
                leverageLong: 20, // Default 20x (Conservative start)
                leverageShort: 20,
                positionSide: 'long', // Default bias, or 'both' if your system supports it
                signalProcessingMethod: "consensus",
                // Ensure the system knows this is a simple trade setup
                positionSizingMethod: "simple"
            },

            // --- FIX 4: Correct Risk Strategy ---
            riskStrategy: 'SimpleStrategy', // Matches your manual bot
            riskParams: {
                positionSizingMethod: "simple",
                riskFraction: 0.05, // Risk 5% of wallet per trade
                stopLossDistance: 0.02 // 2% price distance
            },

            // --- FIX 5: Exchange Modes ---
            positionMode: 'single', // Matches manual bot
            fundMode: 'isolated',   // Matches manual bot

            // --- FIX 6: Funds ---
            marketInfo: {
                baseFund: 10000, // Will be updated by system
                tradeFund: 1000, // Allocate $100 (or equivalent) for this bot
                lastSignal: "HOLD"
            },

            // --- The AI Strategy ---
            indicators: [
                {
                    name: "N8NBotRunner",
                    timeframe: timeframe,
                    params: {
                        jobId: n8nJob._id.toString(),
                        windowSize: 100
                    }
                }
            ]
        });

        const savedBot = await newBot.save();
        console.log(`💾 Bot Saved: ${savedBot._id}`);

        // Register with Live Service
        BotService.registerBot(savedBot);
        console.log(`✅ Bot Registered Live!`);

    } catch (err) {
        console.error("❌ Auto-Deploy Failed:", err.message);
    }
}

module.exports = syncImportedJobs;
