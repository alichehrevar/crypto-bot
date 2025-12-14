// app/http/controllers/botController.js

const BotBase        = require('../../models/BotBase');
const IndicatorBot   = require('../../models/IndicatorBot');
const GridBotModel   = require('../../models/GridBotModel');
const User           = require('../../models/User');
const Trade          = require('../../models/Trade');
const Candle         = require('../../models/Candle');
const BinanceAccount = require('../../models/BinanceAccount');
const OkxAccount     = require('../../models/OkxAccount');
const BingxAccount   = require('../../models/BingxAccount');
const MarketSnapshot = require('../../models/MarketSnapshot');
const BotService     = require('../../services/botService/BotService');
const PnLService     = require('../../services/PnLService');
const logger         = require("../../../logs/logger");

// Default indicator parameters
const defaultStrategyParams = require('../../../config/defaultStrategyParams');
const mongoose = require("mongoose");

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
 * NEW: Controller to create and start an advanced grid bot.
 * Extracts logic previously found in deployBot into a dedicated handler.
 */
exports.createGridBot = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not found.' });
        }

        const {
            name,
            accountId,
            // accountType, // We will derive this from the DB to be safe
            symbol,
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
        const marketSnapshot = await MarketSnapshot.findById(symbol);
        if (!marketSnapshot) {
            return res.status(400).json({ error: 'Invalid symbol selected.' });
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
            gridCount: Number(grids),
            gridMode: gridMode || 'arithmetic', // Default to arithmetic if missing
            gridStepPercentage: 0.01, // Default or calculate based on range
            stopLossPct: 0,
            takeProfitPct: 0,
            flattenOnExit: flattenOnExit === true || flattenOnExit === 'true'
        };

        // Basic validation
        if (!name || !symbol || !gridConfig.lowerPrice || !gridConfig.upperPrice || !gridConfig.gridCount) {
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
        } = req.body;

        const marketSnapshot = await MarketSnapshot.findById(symbol);
        if (!marketSnapshot) {
            return res.status(400).json({ error: 'Wrong symbol is selected.' });
        }

        // Parse indicators if string
        if (typeof indicators === 'string') {
            try {
                indicators = JSON.parse(indicators);
            } catch (e) {
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
            mode:          'live',
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
 * Retrieve all bots (indicator + grid) for the current user.
 */
/**
 * Retrieve all bots (indicator + grid + n8n) for the current user.
 */
exports.getBots = async (req, res) => {
    const { active } = req.query;
    // console.log('getBots active:', active);

    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not found.' });
        }

        // Base filter: User ID and Active Status
        const filter = { userId };

        // Handle 'active' query param (string 'true'/'false' to boolean)
        if (active !== undefined && active !== 'undefined' && active !== '') {
            filter.active = (active === 'true' || active === true);
        }

        const botType = req.query.botType;

        // --- EXPANDED FILTER LOGIC ---
        if (botType && botType !== 'undefined' && botType !== 'all') {
            if (botType === 'n8n') {
                // If frontend asks for 'n8n', looking for n8n accounts OR technical botType
                filter.$or = [
                    { accountType: 'n8n' },
                    { botType: 'technical' }
                ];
            } else {
                // Standard filter for 'grid', 'indicator', etc.
                filter.botType = botType;
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
        const bot = await BotBase.findById(req.params.id).lean();
        if (!bot) {
            return res.status(404).json({ success: false, error: 'Bot not found' });
        }
        return res.json({ success: true, bot });
    }
    catch (err) {
        console.error('getBotById error:', err);
        logger.error(`getBotById error: ${err.message}`, { stack: err.stack });
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
                return res.status(400).json({ error: 'Invalid JSON for gridConfig' });
            }
        }

        // If updating strategyParams for an indicator bot, parse JSON
        if (req.body.strategyParams && typeof req.body.strategyParams === 'string') {
            try {
                req.body.strategyParams = JSON.parse(req.body.strategyParams);
            } catch {
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
            'RSI','MACD','MA_Crossover','Donchian','Volume',
            'Heikin_Ashi','Combined_RSI_MACD','Bollinger_Bands','Stochastic_RSI'
        ],
        OptMethod: ['grid', 'bayesian', 'ann'],
        timeframeOptions: ['1m','5m','15m','30m','1h','4h','1d','1w'],
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

exports.getBotDetails = async (req, res) => {
    try {
        const { botId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(botId)) {
            return res.status(400).json({ message: 'Invalid botId format.' });
        }

        const botBase = await BotBase.findById(botId).lean();

        if (!botBase) {
            return res.status(404).json({ message: 'Bot not found.', success: false });
        }

        const enriched = await calculateRelatedDataToBot(botBase);

        res.status(200).json({ data: enriched, success: true });
    } catch (error) {
        console.error('Error fetching bot details:', error);
        res.status(500).json({ message: 'Internal server error while fetching bot details.', success: false });
    }
}
