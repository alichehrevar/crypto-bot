const mongoose = require('mongoose');
const {
    CustomAIWorkflowJob_DefaultDB,
    N8nWorkflowJob_CustomAiDB
} = require('../models/N8nWorkflowJob');

const BotBase = require('../models/BotBase');
const TechnicalBotModel = require('../models/TechnicalBotModel'); // ADDED: Specific model for validation
const BotService = require('./botService/BotService');
const Account = require('../models/Account');
const logger = require("../../logs/logger");

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
        } catch (err) {
            console.error('Polling Error:', err.message);
        }
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

        // 2. Safely handle User ID
        let validUserId;
        try {
            validUserId = new mongoose.Types.ObjectId(sourceDoc.userId);
        } catch (e) {
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
        logger.error('❌ Error saving to Main DB:', err.message);
        console.error('❌ Error saving to Main DB:', err.message);
    }
}

async function autoDeployBot(n8nJob) {
    try {
        const inputParams = n8nJob.requestPayload || {};

        let symbol = inputParams.backtestSymbol || "BTC/USDT";

        // --- Symbol Normalization Fix ---
        // AI returns "BTCUSDT". We must convert it to "BTC/USDT" for the WebSockets.
        if (!symbol.includes('/') && symbol.endsWith('USDT')) {
            symbol = symbol.replace('USDT', '/USDT');
        } else if (!symbol.includes('/') && symbol.endsWith('USDC')) {
            symbol = symbol.replace('USDC', '/USDC');
        }

        const timeframe = inputParams.backtestInterval || "15m";
        const requestID = n8nJob.responsePayload?.requestID || Date.now();
        const botName = `AI-Bot-${requestID}`;

        console.log(`🚀 Auto-Deploying Bot: ${botName} for ${symbol}...`);

        let accountId;
        let accountType = 'n8n';

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
        // CHANGED: Use TechnicalBotModel instead of BotBase to prevent fields from being stripped
        const newBot = new TechnicalBotModel({
            name: botName,
            symbol: symbol,
            timeframe: timeframe,
            userId: n8nJob.userId,
            active: true,
            mode: 'paper',

            marketType: 'SPOT', // CRITICAL FIX: This field is required by base schema

            botType: "technical",
            accountType: accountType,
            accountId: accountId,

            tradeInfo: {
                takeProfit: 10,
                stopLoss: 5,
                leverageLong: 20,
                leverageShort: 20,
                positionSide: 'long',
                signalProcessingMethod: "consensus",
                positionSizingMethod: "simple"
            },

            riskStrategy: 'SimpleStrategy',
            riskParams: {
                positionSizingMethod: "simple",
                riskFraction: 0.05,
                stopLossDistance: 0.02
            },

            positionMode: 'single',
            fundMode: 'isolated',

            marketInfo: {
                baseFund: 10000,
                tradeFund: 100,
                lastSignal: "HOLD"
            },

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

        BotService.registerBot(savedBot);
        console.log(`✅ Bot Registered Live!`);

    } catch (err) {
        // ENHANCED LOGGING: Will print the specific Mongoose validation paths that failed
        logger.error(`❌ Auto-Deploy Failed: ${err.message}`);
        console.error(`❌ Auto-Deploy Failed: ${err.message}`);
        if (err.errors) {
            console.error("Validation Details:", err.errors);
        }
    }
}

module.exports = syncImportedJobs;
