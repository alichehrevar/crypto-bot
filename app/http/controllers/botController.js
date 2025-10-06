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
const BotService     = require('../../services/botService/BotService');
const PnLService     = require('../../services/PnLService');
const logger = require("../../../logs/logger");
const BotManagerService = require('../../services/botService/BotManagerService');

// Default indicator parameters
const defaultStrategyParams = require('../../../config/defaultStrategyParams');


// NEW: Controller to create an advanced grid bot using the new service structure
exports.createGridBot = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not found.' });
        }

        const {
            name,
            accountId,
            accountType,
            exchange,
            symbol,
            marketType,
            lowerPrice,
            upperPrice,
            grids, // Note this name difference
            gridMode,
            investment,
            takeProfitPrice,
            stopLossPrice,
            flattenOnExit
        } = req.body;


        // The bot configuration should match our new GridBotModel schema
        const botConfig = {
            name,
            accountId,
            accountType,
            exchange,
            symbol,
            marketType,
            investment,
            takeProfitPrice,
            stopLossPrice,
            flattenOnExit,
            userId, // from your authenticated user
            riskStrategy: 'SimpleStrategy',
            timeframe: '1h',
            gridConfig: { // Create the required nested object
                lowerPrice,
                upperPrice,
                gridCount: grids, // Map 'grids' to 'gridCount'
                // gridType: gridMode // You might need to map this too, see below
            }
        };

        // Basic validation
        if (!botConfig.name || !botConfig.symbol || !botConfig.exchange || !botConfig.marketType) {
            return res.status(400).json({ error: 'Name, symbol, exchange, and marketType are required.' });
        }

        const botInstance = await BotManagerService.createAndStartBot(botConfig);

        res.status(201).json({ success: true, message: "Grid bot created and started successfully.", bot: botInstance.bot });

    } catch(err) {
        console.error('createGridBot error:', err);
        logger.error(`createGridBot error: ${err.message}`, { stack: err.stack });
        return res.status(500).json({ success: false, error: err.message });
    }
};

// NEW: Controller to hard-stop an advanced grid bot
exports.stopGridBot = async (req, res) => {
    try {
        const { id } = req.params;
        await BotManagerService.stopBot(id);
        res.status(200).json({ success: true, message: `Grid bot ${id} stopped successfully.` });
    } catch(err) {
        console.error('stopGridBot error:', err);
        logger.error(`stopGridBot error: ${err.message}`, { stack: err.stack });
        return res.status(500).json({ success: false, error: err.message });
    }
};


/**
 * Deploy a new bot (either an indicator bot or a grid bot).
 */
exports.deployBot = async (req, res) => {
    try {
        // 0) Authenticate user (No changes here)
        const user = await User.findById(req.user?.id);
        if (!user) {
            return res.status(401).json({ error: 'User not found.' });
        }

        // 1) Determine which account the user selected (No changes here)
        const { accountId } = req.body;
        let account, accountType;
        account = await BinanceAccount.findById(accountId);
        if (account) accountType = 'binance';
        else {
            account = await OkxAccount.findById(accountId);
            if (account) accountType = 'okx';
            else {
                account = await BingxAccount.findById(accountId);
                if (account) accountType = 'bingx';
            }
        }
        if (!account || !accountType) {
            return res.status(400).json({ error: 'Invalid account selected' });
        }

        // 2) Extract and process fields from the new frontend payload
        let {
            botType = 'indicator',
            name,
            symbol,
            strategy, // "default", "optimized", or "dynamic"
            baseFund,
            tradeFund,
            takeProfit,
            stopLoss,
            positionTakeProfit,
            positionStopLoss,
            compoundPositionSizing, // this is now a boolean
            indicators, // this is now a structured array
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
        } = req.body;

        // CHANGED: The top-level timeframe is no longer sent.
        // We derive it from the first indicator, as the BotBase model requires it.
        // Check if indicators is a string and parse it
        if (typeof indicators === 'string') {
            try {
                indicators = JSON.parse(indicators);
            } catch (e) {
                return res.status(400).json({ success: false, error: 'Invalid format for indicators.' });
            }
        }
        if (botType === 'indicator' && (!Array.isArray(indicators) || indicators.length === 0)) {
            return res.status(400).json({ error: 'At least one indicator is required.' });
        }
        // The frontend sends "timeFrame", the model expects "timeframe".
        const primaryTimeframe = indicators[0].timeFrame || '1h';
        const normalizedTF = primaryTimeframe.toLowerCase();

        // 3) Build “marketInfo”, “tradeInfo”, and "riskParams"
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
            // ADDED: Populate new strategy fields based on bot mode
            ...( (strategy === 'optimized' || strategy === 'dynamic') && {
                optimizationMethod: optimizationMethod,
                minimumAccuracy: Number(minOptimizationAccuracy),
                minSimulatedTrades: Number(minSimulatedTrades),
            }),
            ...( strategy === 'dynamic' && {
                minBotAccuracy: Number(minBotAccuracy),
            }),
        };

        // ADDED: Build riskParams object from new fields
        const riskParams = {
            positionSizingMethod: compoundPositionSizing === true || compoundPositionSizing === 'true' ? 'compound' : 'simple'
        };

        // 4) Branch on botType
        let bot;

        if (botType === 'indicator') {
            ///
            // ── I N D I C A T O R   B O T ─────────────────────────────────────────
            //

            // CHANGED: The 'indicators' field is now a direct array, not a JSON string.
            // We just need to map it to the expected schema format.
            const formattedIndicators = indicators.map(ind => ({
                name:      ind.indicator.name, // Frontend sends "indicator", model wants "name"
                timeframe: (ind.timeFrame || '1h').toString().toLowerCase(), // Frontend sends "timeFrame"
                params:    {} // Assuming default params for now, can be extended if frontend sends them
            }));


            // iv) Create a new IndicatorBot document with an updated structure
            bot = await IndicatorBot.create({
                botType:       'indicator',
                name,
                symbol,
                timeframe:     normalizedTF, // ADDED: Pass the derived primary timeframe
                userId:        user._id,
                accountType,
                accountId:     account._id,

                riskStrategy:  'SimpleStrategy', // Keeping default, can be dynamic if sent from frontend
                riskParams, // UPDATED
                marketInfo,
                tradeInfo, // UPDATED

                indicators:    formattedIndicators, // UPDATED
                strategy:      strategy || 'default',

                fundMode: (marginType || 'isolated').toLowerCase(), // 'Isolated' -> 'isolated'
                positionMode: (positionMode || 'single').toLowerCase(), // 'Single' -> 'single'
                active:        true,
                mode:          'live'
            });
        }
        else if (botType === 'grid') {
            //
            // ── G R I D B O T ─────────────────────────────────────────────────────────
            //
            // the Front end sends gridConfig as a JSON string, so parse it here
            let rawGridConfig = req.body.gridConfig;
            let gridConfig;
            if (typeof rawGridConfig === 'string') {
                try {
                    gridConfig = JSON.parse(rawGridConfig);
                } catch {
                    return res.status(400).json({ error: 'gridConfig must be valid JSON.' });
                }
            } else {
                gridConfig = rawGridConfig;
            }

            // Validate minimal fields
            if (!gridConfig
                || typeof gridConfig.lowerPrice !== 'number'
                || typeof gridConfig.upperPrice !== 'number'
                || typeof gridConfig.gridCount !== 'number'
            ) {
                return res.status(400).json({
                    error: 'gridConfig must contain numeric lowerPrice, upperPrice, and gridCount.'
                });
            }

            // Friendly check: lower < upper
            if (gridConfig.lowerPrice >= gridConfig.upperPrice) {
                return res.status(400).json({
                    error: 'gridConfig.lowerPrice must be less than gridConfig.upperPrice'
                });
            }

            // Create new GridBotModel document
            bot = await GridBotModel.create({
                botType:       'grid',
                name,
                symbol:        symbol,
                timeframe:     '1h', // set a default, doesn't matter
                userId:        user._id,
                accountType,
                accountId:     account._id,

                riskStrategy: 'SimpleStrategy',
                riskParams:    {},        // placeholders
                marketInfo,
                tradeInfo,

                gridConfig: {
                    lowerPrice:         gridConfig.lowerPrice,
                    upperPrice:         gridConfig.upperPrice,
                    gridCount:          gridConfig.gridCount,
                    gridType:           gridConfig.gridType  || 'fixed',
                    gridStepPercentage: gridConfig.gridStepPercentage != null
                        ? gridConfig.gridStepPercentage
                        : 0.01,
                    takeProfitPct:      gridConfig.takeProfitPct != null
                        ? gridConfig.takeProfitPct
                        : 2,
                    stopLossPct:        gridConfig.stopLossPct != null
                        ? gridConfig.stopLossPct
                        : 2,
                    volatilityBasedSL:  gridConfig.volatilityBasedSL === true,
                    trailingStop:       gridConfig.trailingStop !== false,
                    ATRMultiplier:      gridConfig.ATRMultiplier != null
                        ? gridConfig.ATRMultiplier
                        : 3
                },

                positionMode:  'single',
                fundMode:      'cross',
                active:        true,
                mode:          'live'
            });
        }
        else {
            return res.status(400).json({ error: `Unsupported botType: ${botType}` });
        }

        // 5) Register newly created bot in memory‐based BotService
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
 * Retrieve all bots (indicator + grid) for the current user, enriched with PnL and trades.
 */
exports.getBots = async (req, res) => {

    const { active } = req.query;
    console.log('getBots active:', active)

    try {
        const filter = {active: active, userId: req.user?.id};
        const botType = req.query.botType;
        console.log('getBots type:', botType);
        const bots = await BotBase.find(botType && botType !== 'undefined' ? {...filter, botType} : filter).lean();

        const enriched = await Promise.all(bots.map(async bot => {
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
        }));

        return res.json({ success: true, bots: enriched });
    }
    catch (err) {
        console.error('getBots error:', err);
        logger.error(`getBots error: ${err.message}`, { stack: err.stack });
        return res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Retrieve one bot by ID (could be indicator or grid).
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
 * Update a bot’s settings (works for both indicator and grid).
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

        // Save will run proper discriminator‐level validators
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
 * Stop a bot completely.
 */
exports.stopBot = async (req, res) => {
    try {
        const bot = await BotBase.findByIdAndUpdate(
            req.params.id,
            { active: false },
            { new: true }           // return the updated document
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
 * Ensure bots for a symbol/timeframe (upsert). only indicator bots.
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
