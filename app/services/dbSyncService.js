// app/services/dbSyncService.js

const mongoose = require('mongoose');
const { CustomAIWorkflowJob_DefaultDB } = require('../models/N8nWorkflowJob');
const TechnicalBotModel = require('../models/TechnicalBotModel');
const BotService = require('./botService/BotService');
const Account = require('../models/Account');
const User = require('../models/User');
const logger = require("../../logs/logger");

// 🚀 FIX: Import the connection directly
const customDbConnection = require('../../config/customAiDb');

// 🚀 FIX: Use strict: false for BOTH collections so Mongoose stops destroying the nested AI data!
const N8nRawSchema = new mongoose.Schema({}, { strict: false, collection: 'N8nWorkflowJob' });
const N8nWorkflowJob_CustomAiDB = customDbConnection.model('N8nWorkflowJob_Raw', N8nRawSchema);

const AiModelSchema = new mongoose.Schema({}, { strict: false, collection: 'AiModel' });
const AiModel_CustomAiDB = customDbConnection.model('AiModel', AiModelSchema);

async function syncImportedJobs() {
    console.log('🔄 Sync Service: Initializing...');

    if (customDbConnection.readyState !== 1) {
        await new Promise(resolve => customDbConnection.once('open', resolve));
        console.log('✅ Sync Service: CustomAiDB Connected!');
    }

    // Initialize watchers for BOTH collections
    setupWatcher(N8nWorkflowJob_CustomAiDB, 'N8nWorkflowJob');
    setupWatcher(AiModel_CustomAiDB, 'AiModel');
}

/**
 * Reusable function to set up Change Streams or Polling for any collection
 */
function setupWatcher(Model, collectionName) {
    async function init() {
        console.log(`📍 Sync Service: [${collectionName}] Watching for inserts and updates...`);

        try {
            // Watch for BOTH Inserts and Updates, requesting the full document
            const changeStream = Model.watch(
                [{ $match: { operationType: { $in: ['insert', 'update', 'replace'] } } }],
                { fullDocument: 'updateLookup' }
            );

            changeStream.on('change', async (next) => {
                const doc = next.fullDocument;
                if (!doc) return;

                // GUARD CLAUSE: Wait until N8N has actually attached the 'response' object
                if (!doc.response) return;

                await processNewRecord(doc, collectionName);
            });

            changeStream.on('error', () => startPolling());
        } catch (error) {
            startPolling();
        }
    }

    function startPolling() {
        console.log(`🕰️ Sync Service: [${collectionName}] Polling Mode Activated.`);
        setInterval(async () => {
            try {
                // Fallback: Check the 10 most recently updated docs that HAVE a response
                const query = { response: { $exists: true, $ne: null } };
                const recentJobs = await Model.find(query).sort({ updatedAt: -1 }).limit(10);

                for (const job of recentJobs.reverse()) {
                    await processNewRecord(job, collectionName);
                }
            } catch (err) {
                console.error(`[${collectionName}] Polling Error:`, err.message);
            }
        }, 5000);
    }

    init();
}

async function processNewRecord(sourceDoc, collectionName) {
    try {
        // Fetch the admin user from the database
        const adminUser = await User.findOne({ role: 'admin' });

        // Use the admin's ID as the requestId if sourceDoc.response.requestID is not available
        const requestId = sourceDoc.response?.requestID || (adminUser ? adminUser._id.toString() : `auto-${Date.now()}`);
        const sourceId = sourceDoc._id.toString();

        // 1. Check for duplicates
        const exists = await CustomAIWorkflowJob_DefaultDB.findOne({
            'responsePayload.n8nSourceId': sourceId
        });
        if (exists) {
            console.log(`⚠️ Skipped Duplicate: ${requestId} from ${collectionName}`);
            return;
        }

        console.log(`✨ Processing New Record from [${collectionName}]: ${requestId}`);

        // 2. Safely handle User ID
        let validUserId;
        try {
            validUserId = sourceDoc.userId
                ? new mongoose.Types.ObjectId(sourceDoc.userId)
                : (adminUser ? adminUser._id : new mongoose.Types.ObjectId("000000000000000000000000"));
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
                strategy: sourceDoc.response?.strategy,
                backtest: sourceDoc.response?.backtest,
                status: sourceDoc.response?.status,
                requestID: requestId
            },
            error: sourceDoc.error || null,
            createdAt: sourceDoc.createdAt || new Date()
        };

        const newDoc = await CustomAIWorkflowJob_DefaultDB.create(payloadToSave);
        console.log(`✅ Synced Record ID: ${newDoc._id}`);

        // 🚀 FIX: Pass the raw un-stripped payload to autoDeployBot
        const deploymentPayload = {
            _id: newDoc._id,
            userId: payloadToSave.userId,
            requestPayload: payloadToSave.requestPayload,
            responsePayload: payloadToSave.responsePayload
        };

        await autoDeployBot(deploymentPayload);

    } catch (err) {
        logger.error(`❌ Error saving to Main DB: ${err.message}`);
    }
}

async function autoDeployBot(n8nJob) {
    try {
        const inputParams = n8nJob.requestPayload || {};
        const responsePayload = n8nJob.responsePayload || {};

        // 1. Normalize Symbol (Fixes "BTCUSDT" -> "BTC/USDT")
        let symbol = inputParams.backtestSymbol || inputParams.symbol || "BTC/USDT";
        if (!symbol.includes('/') && symbol.endsWith('USDT')) symbol = symbol.replace('USDT', '/USDT');
        else if (!symbol.includes('/') && symbol.endsWith('USDC')) symbol = symbol.replace('USDC', '/USDC');

        const timeframe = inputParams.backtestInterval || inputParams.timeframe || "15m";
        const requestID = responsePayload.requestID || Date.now();
        const botName = `AI-Bot-${requestID}`;

        console.log(`🚀 Auto-Deploying Bot: ${botName} for ${symbol}...`);

        // 2. Find Real Account
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
        }

        // 3. Dynamic Indicator Routing
        let dynamicIndicators = [];

        const aiIndicatorDictionary = {
            'BBands': 'Bollinger_Bands',
            'SmoothedHA': 'SmoothedHeikinAshi',
            'MA': 'SMA',
            'EMA': 'SMA',
            'StochRSI': 'Stochastic_RSI',
            'MACD': 'MACD',
            'RSI': 'RSI',
            'ATR': 'ATR'
        };

        const validSchemaEnums = [
            'RSI', 'MACD', 'MA_Crossover', 'Donchian',
            'Volume', 'Heikin_Ashi', 'Combined_RSI_MACD',
            'Bollinger_Bands', 'Stochastic_RSI',
            'N8NBotRunner', 'N8nStrategy', 'SmoothedHeikinAshi', 'ATR'
        ];

        // Scenario A: AI generated Custom JavaScript Code
        if (responsePayload.generatedCode && (responsePayload.generatedCode.code || responsePayload.generatedCode.fullCode)) {
            dynamicIndicators = [{
                name: "N8NBotRunner",
                timeframe: timeframe,
                params: {
                    jobId: n8nJob._id.toString(),
                    windowSize: 100
                }
            }];
        }
        // Scenario B: AI selected Native Indicators (AiModel format)
        else if (responsePayload.strategy && responsePayload.strategy.selectedIndicators) {
            responsePayload.strategy.selectedIndicators.forEach(ind => {
                const mappedName = aiIndicatorDictionary[ind.name] || ind.name;
                if (validSchemaEnums.includes(mappedName)) {
                    dynamicIndicators.push({
                        name: mappedName,
                        timeframe: timeframe,
                        params: ind
                    });
                }
            });

            if (dynamicIndicators.length === 0) {
                throw new Error('AI provided indicators, but none matched supported system indicators.');
            }
        }
        else {
            throw new Error('AI payload does not contain generatedCode or selectedIndicators.');
        }

        // 4. Create Bot with FULL Configuration
        const newBot = new TechnicalBotModel({
            name: botName,
            symbol: symbol,
            timeframe: timeframe,
            userId: n8nJob.userId,
            active: true,
            mode: 'paper',
            marketType: 'SPOT',
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

            indicators: dynamicIndicators
        });

        const savedBot = await newBot.save();
        console.log(`💾 Bot Saved: ${savedBot._id}`);

        BotService.registerBot(savedBot);
        console.log(`✅ Bot Registered Live!`);

    } catch (err) {
        logger.error(`❌ Auto-Deploy Failed: ${err.message}`);
        console.error(`❌ Auto-Deploy Failed: ${err.message}`);
    }
}

module.exports = syncImportedJobs;
