// app/http/controllers/botController.js

const BotFactoryDeployment = require('../../services/botService/BotFactoryDeployment');
const BotBase        = require('../../models/BotBase');
const okxWS = require('../../services/okxWS');
const bingXWS = require('../../services/bingXWS');
const BotMetrics        = require('../../metrics/BotMetrics');
const IndicatorBot   = require('../../models/IndicatorBot');
const GridBotModel   = require('../../models/GridBotModel');
const User           = require('../../models/User');
const Trade          = require('../../models/Trade');
const Candle         = require('../../models/Candle');
const BinanceAccount = require('../../models/BinanceAccount');
const OkxAccount     = require('../../models/OkxAccount');
const BingxAccount   = require('../../models/BingxAccount');
const MarketSnapshot = require('../../models/MarketSnapshot');
const BotLog = require('../../models/BotLog');
const BotService     = require('../../services/botService/BotService');
const PnLService     = require('../../services/PnLService');
const logger         = require("../../../logs/logger");

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Default indicator parameters
const defaultStrategyParams = require('../../../config/defaultStrategyParams');

// --- Helper to find account by ID across collections ---
async function findAccount(accountId) {
    let account = await BinanceAccount.findById(accountId);
    if (account) return { account, accountType: 'binance' };

    account = await OkxAccount.findById(accountId);
    if (account) return { account, accountType: 'okx' };

    account = await BingxAccount.findById(accountId);
    if (account) return { account, accountType: 'bingx' };

    return { account: null, accountType: null };
}

/**
 * Unified Bot Creation Endpoint
 * Handles 'technical', 'grid', and 'dca' bots dynamically.
 */
exports.createBot = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not found.' });
        }

        const botType = req.body.botType;
        if (!botType) {
            return res.status(400).json({ error: 'botType is required (grid, dca, technical).' });
        }

        // Delegate creation to Factory
        const newBot = await BotFactoryDeployment.createBot(botType, req.body, userId);

        // Register in Memory Service (Start the bot)
        if (newBot.active) {
            BotService.registerBot(newBot);

            // ==========================================
            // DYNAMIC WEBSOCKET SUBSCRIPTIONS
            // ==========================================
            const timeframe = newBot.timeframe || '1m';

            if (newBot.accountType === 'okx') {
                // Format to OKX standard (BTC-USDT)
                let okxSymbol = newBot.symbol.toUpperCase().replace('/', '-');
                if (!okxSymbol.includes('-')) {
                    okxSymbol = okxSymbol.replace('USDT', '-USDT').replace('USDC', '-USDC');
                }
                okxWS.subscribeCandles(okxSymbol, timeframe);
            }
            else if (newBot.accountType === 'bingx') {
                // BingX format (BTC-USDT)
                let bingxSymbol = newBot.symbol.toUpperCase().replace('/', '-');
                if (!bingxSymbol.includes('-')) {
                    bingxSymbol = bingxSymbol.replace('USDT', '-USDT').replace('USDC', '-USDC');
                }
                // bingXWS already has a subscribe method
                bingXWS.subscribe(bingxSymbol, timeframe);
            }
            // Note: Binance uses a global miniTicker stream, so it doesn't need explicit symbol subscriptions.
        }

        return res.status(201).json({
            success: true,
            message: `${botType} bot created successfully.`,
            bot: newBot
        });

    } catch (err) {
        console.error('createBot error:', err);
        // logger.error(`createBot error: ${err.message}`, { stack: err.stack });
        return res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * NEW: Controller to create and start an advanced grid bot.
 * Extracts logic previously found in deployBot into a dedicated handler.
 */
exports.createGridBot = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not found.' });
        }

        console.log(req.body)

        const {
            name,
            accountId,
            // accountType, // We will derive this from the DB to be safe
            symbol,
            marketType,
            lowerPrice,
            upperPrice,
            grids, // Frontend sends 'grids', DB expects 'gridCount'
            gridMode, // 'arithmetic' or 'geometric'
            investment,
            takeProfitPrice, // Optional: Bot level TP
            stopLossPrice,   // Optional: Bot level SL
            flattenOnExit,
            baseFund,
        } = req.body;

        // 1. Validate Market
        let marketSnapshot;

        // check if symbol exists AND is not the string "undefined"
        if (symbol && symbol !== 'undefined') {
            marketSnapshot = await MarketSnapshot.findById(symbol);
        } else {
            marketSnapshot = await MarketSnapshot.findOne({
                name: "Binance",
                symbol: "BTC",
                category: "Spot"
            });
        }

        if (!marketSnapshot) {
            return res.status(400).json({ error: 'Wrong symbol is selected.' });
        }

        // 2. Validate Account
        const { account, accountType: type } = await findAccount(accountId);
        if (!account) {
            return res.status(400).json({ error: 'Invalid account selected.' });
        }

        // 3. Prepare Configuration Objects
        const marketInfo = {
            baseFund:  Number(baseFund) || 10000,
            tradeFund: Number(investment) || 50
        };

        const tradeInfo = {
            // Map specific grid bot trade settings if needed
            leverageLong: 1, // Grid bots usually run 1x or specified leverage
            leverageShort: 1,
            // Add bot-level TP/SL to tradeInfo or root level depending on your model structure
            botTakeProfit: Number(takeProfitPrice) || null,
            botStopLoss: Number(stopLossPrice) || null,
        };

        const gridConfig = {
            lowerPrice: Number(lowerPrice),
            upperPrice: Number(upperPrice),
            grids: Number(grids),
            investment: Number(investment),
            gridMode: (gridMode || 'arithmetic').toUpperCase(), // Default to arithmetic if missing
            gridStepPercentage: 0.01, // Default or calculate based on range
            stopLossPct: 0,
            takeProfitPct: 0,
            flattenOnExit: flattenOnExit === true || flattenOnExit === 'true'
        };

        // Basic validation
        if (!name || !gridConfig.lowerPrice || !gridConfig.upperPrice || !gridConfig.grids) {
            return res.status(400).json({ error: 'Name, symbol, lowerPrice, upperPrice, and grids are required.' });
        }

        if (gridConfig.lowerPrice >= gridConfig.upperPrice) {
            return res.status(400).json({ error: 'Lower price must be less than Upper price.' });
        }

        // 4. Create Database Entry
        const newBot = await GridBotModel.create({
            botType:       'grid',
            name,
            symbol:        marketSnapshot.symbol,
            timeframe:     '1h', // Grid bots usually ignore timeframe, but field is required
            userId,
            accountType:   type,
            accountId:     account._id,
            active:        true,
            mode:          'live', // or 'paper' based on req.body
            marketType,

            riskStrategy:  'SimpleStrategy',
            riskParams:    {},
            marketInfo,
            tradeInfo,
            gridConfig,

            positionMode:  'single',
            fundMode:      'isolated'
        });

        // 5. Register in Memory Service
        BotService.registerBot(newBot);

        res.status(201).json({ success: true, message: "Grid bot created and started successfully.", bot: newBot });

    } catch(err) {
        console.error('createGridBot error:', err);
        logger.error(`createGridBot error: ${err.message}`, { stack: err.stack });
        return res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * NEW: Controller to hard-stop a grid bot.
 * Utilizes the standard BotService deactivation logic.
 */
exports.stopGridBot = async (req, res) => {
    try {
        const { id } = req.params;

        const bot = await BotBase.findByIdAndUpdate(
            id,
            { active: false },
            { new: true }
        );

        if (!bot) {
            return res.status(404).json({ success: false, error: 'Grid bot not found.' });
        }

        // Clean up from memory
        BotService.deactivateBot(bot);

        res.status(200).json({ success: true, message: `Grid bot ${id} stopped successfully.` });
    } catch(err) {
        console.error('stopGridBot error:', err);
        logger.error(`stopGridBot error: ${err.message}`, { stack: err.stack });
        return res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Deploy a new Indicator Bot.
 * (Logic for Grid bots has been removed and moved to createGridBot)
 */
exports.deployBot = async (req, res) => {
    try {
        // 0) Authenticate user
        const user = await User.findById(req.user?.id);
        if (!user) {
            return res.status(401).json({ error: 'User not found.' });
        }

        // 1) Account Lookup
        const { accountId } = req.body;
        const { account, accountType } = await findAccount(accountId);

        if (!account || !accountType) {
            return res.status(400).json({ error: 'Invalid account selected' });
        }

        // 2) Extract fields (Indicator Bot specific)
        let {
            name,
            symbol,
            strategy, // "default", "optimized", or "dynamic"
            baseFund,
            tradeFund,
            takeProfit,
            stopLoss,
            positionTakeProfit,
            positionStopLoss,
            compoundPositionSizing,
            indicators,
            // Fields for optimized/dynamic strategies
            optimizationMethod,
            minOptimizationAccuracy,
            minSimulatedTrades,
            minBotAccuracy,
            marginType,
            positionMode,
            singleModeSide,
            leverageLong,
            leverageShort,
            share,
            mode,
        } = req.body;

        let marketSnapshot;

        // check if symbol exists AND is not the string "undefined"
        if (symbol && symbol !== 'undefined') {
            marketSnapshot = await MarketSnapshot.findById(symbol);
        } else {
            marketSnapshot = await MarketSnapshot.findOne({
                name: "Binance",
                symbol: "BTC",
                category: "Spot"
            });
        }

        if (!marketSnapshot) {
            return res.status(400).json({ error: 'Wrong symbol is selected.' });
        }

        // Parse indicators if string
        if (typeof indicators === 'string') {
            try {
                indicators = JSON.parse(indicators);
            } catch (e) {
                logger.error('Invalid format for indicators.' + e.message)
                return res.status(400).json({ success: false, error: 'Invalid format for indicators.' });
            }
        }

        if (!Array.isArray(indicators) || indicators.length === 0) {
            return res.status(400).json({ error: 'At least one indicator is required for Indicator Bots.' });
        }

        const primaryTimeframe = indicators[0].timeFrame || '1h';
        const normalizedTF = primaryTimeframe.toLowerCase();

        // 3) Build Config Objects
        const marketInfo = {
            baseFund:  Number(baseFund) || 10000,
            tradeFund: Number(tradeFund) || 50
        };

        const tradeInfo = {
            takeProfit:  Number(takeProfit),
            stopLoss:    Number(stopLoss),
            positionTakeProfit: Number(positionTakeProfit),
            positionStopLoss: Number(positionStopLoss),
            leverageLong: Number(leverageLong) || 50,
            leverageShort: Number(leverageShort) || 50,
            positionSide: (singleModeSide || 'long').toLowerCase() !== 'both'
                ? (singleModeSide || 'long').toLowerCase()
                : 'long',
            ...( (strategy === 'optimized' || strategy === 'dynamic') && {
                optimizationMethod: optimizationMethod,
                minimumAccuracy: Number(minOptimizationAccuracy),
                minSimulatedTrades: Number(minSimulatedTrades),
            }),
            ...( strategy === 'dynamic' && {
                minBotAccuracy: Number(minBotAccuracy),
            }),
        };

        const riskParams = {
            positionSizingMethod: compoundPositionSizing === true || compoundPositionSizing === 'true' ? 'compound' : 'simple'
        };

        // 4) Map Indicators
        const formattedIndicators = indicators.map(ind => ({
            name:      ind.indicator.name,
            timeframe: (ind.timeFrame || '1h').toString().toLowerCase(),
            params:    {}
        }));

        // 5) Create IndicatorBot Document
        const bot = await IndicatorBot.create({
            botType:       'indicator',
            name,
            symbol:        marketSnapshot.symbol,
            timeframe:     normalizedTF,
            userId:        user._id,
            accountType,
            accountId:     account._id,

            riskStrategy:  'SimpleStrategy',
            riskParams,
            marketInfo,
            tradeInfo,

            indicators:    formattedIndicators,
            strategy:      strategy || 'default',

            fundMode:      (marginType || 'isolated').toLowerCase(),
            positionMode:  (positionMode || 'single').toLowerCase(),
            active:        true,
            mode,
            share
        });

        // 6) Register in Memory Service
        BotService.registerBot(bot);

        return res.status(201).json({ success: true, bot });
    }
    catch (err) {
        console.error('deployBot error:', err);
        logger.error(`deployBot error: ${err.message}`, { stack: err.stack });
        return res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Retrieve all bots (indicator + grid + n8n) for the current user.
 */
exports.getBots = async (req, res) => {
    const { active } = req.query;

    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not found.' });
        }

        const filter = {  };

        // Handle 'active' query param (string 'true'/'false' to boolean)
        if (active !== undefined && active !== 'undefined' && active !== '') {
            filter.active = (active === 'true' || active === true);
        }

        const botType = req.query.botType;

        // --- EXPANDED FILTER LOGIC ---
        if (botType && botType !== 'undefined' && botType !== 'all') {
            filter.botType = botType;
            if (botType !== 'technical') {
                filter.userId = userId;
            }
        }

        // Fetch bots with the constructed filter
        const bots = await BotBase.find(filter).sort({ createdAt: -1 }).lean();

        // Enrich data (PnL, Trades)
        const enriched = await calculateRelatedDataToBots(bots);

        return res.json({ success: true, bots: enriched });
    }
    catch (err) {
        console.error('getBots error:', err);
        logger.error(`getBots error: ${err.message}`, { stack: err.stack });
        return res.status(500).json({ success: false, error: err.message });
    }
};

async function calculateRelatedDataToBots (bots) {
    return await Promise.all(bots.map(async bot => {
        return calculateRelatedDataToBot(bot)
    }));
}

async function calculateRelatedDataToBot (bot) {
    const price = bot.marketInfo?.currentCandle?.price;
    let pnl = {realized: 0, unrealized: 0, total: 0};
    if (typeof price === 'number') {
        pnl = await PnLService.getBotPnL(bot._id, price);
    }
    const base = bot.marketInfo?.baseFund || 1;
    const pct = base > 0 ? (pnl.total / base * 100) : 0;

    const trades = await Trade
        .find({bot: bot._id})
        .sort({timestamp: -1})
        .lean();

    return {
        ...bot,
        pnl: {
            ...pnl,
            pct: Number(pct.toFixed(2))
        },
        trades
    };
}

/**
 * Retrieve one bot by ID.
 */
exports.getBotById = async (req, res) => {
    try {
        const bot = req.botBase; // Provided by bindBot middleware

        // Fetch trades strictly matching the schema
        // Sorted by timestamp ascending for correct metric calculation logic
        const trades = await Trade.find({ bot: bot._id })
            .sort({ timestamp: 1 })
            .lean();

        const metrics = BotMetrics.calculateBotMetrics(bot, trades);

        // Reverse for display (Newest first in the UI table)
        const displayTrades = [...trades].reverse();

        return res.json({
            success: true,
            bot: bot,
            metrics: metrics,
            trades: displayTrades,
            defaultStrategyParams
        });

    } catch (err) {
        // Log logic...
        return res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Update a bot’s settings.
 */
exports.updateBot = async (req, res) => {
    try {
        const existing = await BotBase.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Bot not found' });
        }

        // If updating gridConfig, parse nested JSON if it arrives as a string
        if (req.body.gridConfig && typeof req.body.gridConfig === 'string') {
            try {
                req.body.gridConfig = JSON.parse(req.body.gridConfig);
            } catch {
                logger.error('Invalid JSON for gridConfig')
                return res.status(400).json({ error: 'Invalid JSON for gridConfig' });
            }
        }

        // If updating strategyParams for an indicator bot, parse JSON
        if (req.body.strategyParams && typeof req.body.strategyParams === 'string') {
            try {
                req.body.strategyParams = JSON.parse(req.body.strategyParams);
            } catch {
                logger.error('Invalid JSON for strategyParams')
                return res.status(400).json({ error: 'Invalid JSON for strategyParams' });
            }
        }

        // Merge req.body onto the existing Mongoose document
        Object.keys(req.body).forEach(key => {
            existing[key] = req.body[key];
        });

        const updated = await existing.save();

        if (updated.active) {
            BotService.updateBot(updated);
        } else {
            BotService.removeBot(updated);
        }

        return res.json({ success: true, bot: updated });
    }
    catch (err) {
        console.error('updateBot error:', err);
        logger.error(`updateBot error: ${err.message}`, { stack: err.stack });
        return res.status(400).json({ success: false, error: err.message });
    }
};

/**
 * Stop a bot completely (Generic).
 */
exports.stopBot = async (req, res) => {
    try {
        const bot = await BotBase.findByIdAndUpdate(
            req.params.id,
            { active: false },
            { new: true }
        );

        if (!bot) {
            return res.status(404).json({ success: false, error: 'Bot not found' });
        }

        BotService.deactivateBot(bot);
        return res.json({ success: true, message: `"${bot.name}" deactivated.` });
    }
    catch (err) {
        console.error('deleteBot error:', err);
        logger.error(`deleteBot error: ${err.message}`, { stack: err.stack });
        return res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Ensure bots for a symbol/timeframe (upsert). Only indicator bots.
 */
exports.selectBots = async (req, res) => {
    try {
        let { symbol, timeframe, strategy } = req.query;
        if (!symbol || !timeframe) {
            return res.status(400).json({ success: false, error: 'Symbol and timeframe are required' });
        }
        symbol    = symbol.toString().toUpperCase();
        timeframe = timeframe.toString().toLowerCase();

        const list = strategy ? [strategy] : ['MA_Crossover','RSI','MACD'];

        for (const ind of list) {
            const indicatorsArray = [{
                name:      ind,
                timeframe,
                params:    defaultStrategyParams[ind] || {}
            }];

            await IndicatorBot.findOneAndUpdate(
                {
                    symbol,
                    timeframe,
                    'indicators.name': ind,
                    botType: 'indicator'
                },
                {
                    $set: {
                        name:         `${symbol} ${timeframe} ${ind} Bot`,
                        indicators:   indicatorsArray,
                        riskStrategy: 'SimpleStrategy',
                        tradeInfo:    { leverage: 1 },
                        marketInfo:   { baseFund: 10000, tradeFund: 50 },
                        active:       true,
                        mode:         'paper'
                    }
                },
                { upsert: true, new: true, runValidators: true }
            );
        }

        const bots = await BotBase.find({ symbol, timeframe }).lean();
        return res.json({ success: true, bots });
    }
    catch (err) {
        console.error('selectBots error:', err);
        logger.error(`selectBots error: ${err.message}`, { stack: err.stack });
        return res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Pause a bot (set active=false, remove from BotService).
 */
exports.pauseBot = async (req, res) => {
    try {
        const bot = await BotBase.findById(req.params.id);
        if (!bot) {
            return res.status(404).json({ success: false, error: 'Bot not found' });
        }

        bot.active = false;
        await bot.save();

        BotService.removeBot(bot);
        return res.json({ success: true, message: `"${bot.name}" paused.` });
    }
    catch (err) {
        console.error('pauseBot error:', err);
        logger.error(`pauseBot error: ${err.message}`, { stack: err.stack });
        return res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Resume a bot (set active=true, register in BotService).
 */
exports.resumeBot = async (req, res) => {
    try {
        const bot = await BotBase.findById(req.params.id);
        if (!bot) {
            return res.status(404).json({ success: false, error: 'Bot not found' });
        }

        bot.active = true;
        await bot.save();

        BotService.registerBot(bot);
        return res.json({ success: true, message: `"${bot.name}" resumed.` });
    }
    catch (err) {
        console.error('resumeBot error:', err);
        logger.error(`resumeBot error: ${err.message}`, { stack: err.stack });
        return res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Close (exit) a trade manually for a given bot.
 */
exports.closeTrade = async (req, res) => {
    try {
        const { botId, tradeId } = req.params;
        const { exitPrice: bodyExit } = req.body;

        // 1) load bot & trade
        const bot = await BotBase.findById(botId);
        if (!bot) {
            return res.status(404).json({ success: false, error: 'Bot not found' });
        }

        const trade = await Trade.findById(tradeId);
        if (!trade) {
            return res.status(404).json({ success: false, error: 'Trade not found' });
        }
        if (trade.exitPrice != null) {
            return res.status(400).json({ success: false, error: 'Trade already closed' });
        }

        // 2) determine exit price
        let exitPrice = bodyExit;
        if (exitPrice == null) {
            const lastCandle = await Candle
                .findOne({ symbol: bot.symbol, timeframe: bot.timeframe, isClosed: true })
                .sort({ timestamp: -1 });
            if (!lastCandle) {
                return res.status(400).json({ success: false, error: 'No recent candle to derive price' });
            }
            exitPrice = lastCandle.close;
        }

        // 3) compute profit
        const { quantity, entryPrice, type } = trade;
        const profit = (type === 'BUY')
            ? (exitPrice - entryPrice) * quantity
            : (entryPrice - exitPrice) * quantity;

        // 4) save trade
        trade.exitPrice = exitPrice;
        trade.profit    = profit;
        trade.timestamp = new Date();
        await trade.save();

        // 5) update bot balances
        if (bot.mode === 'paper') {
            bot.paperBalance = (bot.paperBalance || 0) + profit;
        }
        bot.cumulativePnL = (bot.cumulativePnL || 0) + profit;

        // check bot‐level TP/SL
        if (
            (bot.botTP && bot.cumulativePnL >= bot.botTP) ||
            (bot.botSL && bot.cumulativePnL <= bot.botSL)
        ) {
            bot.active = false;
        }
        await bot.save();

        // 6) broadcast updated bot state
        BotService.updateBot(bot);

        return res.json({ success: true, trade });
    }
    catch (err) {
        console.error('closeTrade error:', err);
        logger.error(`closeTrade error: ${err.message}`, { stack: err.stack });
        return res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Provide front‐end with various dropdown properties.
 */
exports.botProps = async (_, res) => {
    const props = {
        riskStrategyOptions: [
            'KellyCriterionStrategy',
            'MartingaleStrategy',
            'MirroredMartingaleStrategy',
            'SimpleStrategy'
        ],
        indicatorOptions: [
            {
                name: 'Chat-GPT',
                logo: 'https://img.icons8.com/?size=100&id=FBO05Dys9QCg&format=png&color=C1C1C1'
            },
            {
                name: 'Google Gemini',
                logo: 'https://img.icons8.com/?size=100&id=iBkBIBWE6tfT&format=png&color=000000'
            },
            {
                name: 'Grok',
                logo: 'https://img.icons8.com/?size=100&id=USGXKHXKl9X7&format=png&color=C1C1C1'
            },
            { // Represents a separator
                name: '',
                logo: ''
            },
            {
                name: 'RSI',
                logo: 'https://img.icons8.com/?size=100&id=61Ir6g5hzrHL&format=png&color=000000'
            },
            {
                name: 'MACD',
                logo: 'https://img.icons8.com/?size=100&id=61Ir6g5hzrHL&format=png&color=000000'
            },
            {
                name: 'MA_Crossover',
                logo: 'https://img.icons8.com/?size=100&id=61Ir6g5hzrHL&format=png&color=000000'
            },
            {
                name: 'Donchian',
                logo: 'https://img.icons8.com/?size=100&id=61Ir6g5hzrHL&format=png&color=000000'
            },
            {
                name: 'Volume',
                logo: 'https://img.icons8.com/?size=100&id=61Ir6g5hzrHL&format=png&color=000000'
            },
            {
                name: 'Heikin_Ashi',
                logo: 'https://img.icons8.com/?size=100&id=61Ir6g5hzrHL&format=png&color=000000'
            },
            {
                name: 'Combined_RSI_MACD',
                logo: 'https://img.icons8.com/?size=100&id=61Ir6g5hzrHL&format=png&color=000000'
            },
            {
                name: 'Bollinger_Bands',
                logo: 'https://img.icons8.com/?size=100&id=61Ir6g5hzrHL&format=png&color=000000'
            },
            {
                name: 'Stochastic_RSI',
                logo: 'https://img.icons8.com/?size=100&id=61Ir6g5hzrHL&format=png&color=000000'
            }
        ],
        OptMethod: ['grid', 'bayesian', 'ann'],
        timeframeOptions: [
            {name: '1m'},
            {name: '5m'},
            {name: '15m'},
            {name: '30m'},
            {name: '1h'},
            {name: '4h'},
            {name: '1d'},
            {name: '1w'}
        ],
        defaultStrategyParams
    };
    return res.json({ success: true, props });
};

exports.botsList = async (req, res) => {
    const bots = await BotBase.find().lean();
    return res.json({ success: true, data: bots });
}

exports.userBotsList = async (req, res) => {
    const bots = await BotBase.find({ userId: req.params.userId }).lean();
    const enriched = await calculateRelatedDataToBots(bots);

    const groupedBots = enriched.reduce((acc, bot) => {
        const type = bot.botType;
        if (!acc[type]) {
            acc[type] = [];
        }
        acc[type].push(bot);
        return acc;
    }, {});

    return res.json({ success: true, bots: groupedBots });
}

/**
 * Get details for a specific bot.
 * @middleware bindBot (must be applied in route)
 */
exports.getBotDetails = async (req, res) => {
    try {
        // req.botBase is guaranteed to exist and be valid due to bindBot middleware
        // bindBot uses .lean(), so we can pass it directly to the helper
        const enriched = await calculateRelatedDataToBot(req.botBase);

        return res.status(200).json({
            success: true,
            data: enriched
        });

    } catch (error) {
        logger.error(`getBotDetails error: ${error.message}`, { stack: error.stack });
        // console.error is redundant if logger is working, but keeping per your style
        console.error('getBotDetails error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while fetching bot details.'
        });
    }
};

/**
 * Get logs for a specific bot.
 * @middleware bindBot (must be applied in route)
 */
exports.getBotLogsDetails = async (req, res) => {
    try {
        // req.botBase is provided by the middleware
        const botIdStr = req.botBase._id.toString();

        // Query 'meta.botId' because the schema defines botId inside the 'meta' Mixed type
        // UPDATED: Removed .limit(200) to load ALL logs available in MongoDB.
        // Note: MongoDB has a TTL index that keeps logs for 3 days.
        // For older history, check the server file system (logs/reports/bots/).
        const logs = await BotLog.find({
            $or: [
                { 'meta.metadata.botId': botIdStr },
                { 'meta.botId': botIdStr }
            ]
        })
            .sort({ timestamp: -1 }) // Newest first
            .lean();                 // Performance optimization for large datasets

        return res.status(200).json({
            success: true,
            botName: req.botBase.name,
            logs: logs
        });

    } catch (error) {
        logger.error(`getBotLogsDetails error: ${error.message}`, { stack: error.stack });
        console.error('getBotLogsDetails error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while fetching bot logs details.'
        });
    }
};

/**
 * DOWNLOAD LOGS
 * Zips all log files (current + rotated history) for a specific bot.
 * Route: GET /api/bots/:id/logs/download
 * Middleware: bindBot (recommended)
 */
exports.downloadBotLogs = async (req, res) => {
    try {
        // Use req.botBase from middleware, or fallback to params
        const botId = req.botBase ? req.botBase._id.toString() : req.params.id;
        const botName = req.botBase ? req.botBase.name.replace(/[^a-z0-9]/gi, '_') : 'bot';

        // Path to the logs directory defined in botLogger.js
        const logDir = path.join(__dirname, '../../../logs/reports/bots');

        // 1. Validate Directory Exists
        if (!fs.existsSync(logDir)) {
            return res.status(404).json({ success: false, error: 'Log directory not found.' });
        }

        // 2. Find all files belonging to this Bot ID
        // Matches: "ID.log", "ID-2024-01-01.log", "ID-2024-01-01.log.gz"
        const files = fs.readdirSync(logDir).filter(file => file.startsWith(botId));

        if (files.length === 0) {
            return res.status(404).json({ success: false, error: 'No log files found for this bot.' });
        }

        // 3. Set Response Headers for Download
        res.attachment(`${botName}_logs.zip`);

        // 4. Create Zip Stream
        const archive = archiver('zip', {
            zlib: { level: 9 } // Maximum compression
        });

        // Handle archiving errors
        archive.on('error', (err) => {
            logger.error(`Zip download failed for bot ${botId}: ${err.message}`);
            res.status(500).end();
        });

        // Pipe the zip stream to the user's response
        archive.pipe(res);

        // 5. Append each log file to the zip
        for (const file of files) {
            // We give it a pretty name inside the zip (remove the ID prefix if you want, or keep it)
            // Keeping it simple: verify path and append
            const filePath = path.join(logDir, file);
            archive.file(filePath, { name: file });
        }

        // 6. Finalize (sends the data)
        await archive.finalize();

    } catch (err) {
        console.error('downloadBotLogs error:', err);
        logger.error(`downloadBotLogs error: ${err.message}`, { stack: err.stack });
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
};


