// app/http/controllers/botController.js

const BotBase      = require('../../models/BotBase');
const IndicatorBot = require('../../models/IndicatorBot');
const GridBotModel = require('../../models/GridBotModel');
const User         = require('../../models/User');
const Trade        = require('../../models/Trade');
const Candle       = require('../../models/Candle');
const BinanceAccount = require('../../models/BinanceAccount');
const OkxAccount     = require('../../models/OkxAccount');
const BingxAccount   = require('../../models/BingxAccount');
const BotService   = require('../../services/botService/BotService');
const PnLService   = require('../../services/PnLService'); // for getBots enrichment

// Default indicator parameters (unchanged)
const defaultStrategyParams = {
    RSI:               { period: 14, overbought: 70, oversold: 30 },
    MACD:              { shortPeriod: 12, longPeriod: 26, signalPeriod: 9 },
    MA_Crossover:      { shortPeriod: 5,  longPeriod: 20 },
    Donchian:          { period: 20 },
    Volume:            { period: 14 },
    Heikin_Ashi:       {},
    Combined_RSI_MACD: { parameters: { confirmation_window: 6 } },
    Bollinger_Bands:   { period: 20, stdDev: 2 },
    Stochastic_RSI:    { period: 14, kPeriod: 3, dPeriod: 3 },
};

/**
 * Deploy a new bot (either an indicator bot or a grid bot).
 *
 * Expected request body for indicator bots (botType === 'indicator'):
 * {
 *   botType: 'indicator',           // optional (defaults to 'indicator' if omitted)
 *   accountId: <ObjectId>,
 *   name: <string>,
 *   symbol: <string>,
 *   timeframe: <string>,
 *   riskStrategy: <string>,
 *   takeProfit: <number>,
 *   stopLoss: <number>,
 *   leverage: <number>,            // optional (goes into tradeInfo)
 *
 *   // For indicator bots:
 *   indicator: <string>,           // e.g. 'RSI'
 *   timeframe: <string>,           // e.g. '1h'
 *   strategyParams: <object> or JSON string,
 *   additionalIndicators: [ { indicator: <string>, timeframe: <string> }, … ],
 *   strategy: <'default'|'optimized'|'dynamic'>,
 *
 *   // …common fields:
 *   baseFund: <number>,            // optional (goes into marketInfo.baseFund)
 *   tradeFund: <number>,           // optional (goes into marketInfo.tradeFund)
 *   mode:     <'live'|'paper'>,     // will always be 'live' here, we hardcoded it
 *   // userId is gleaned from req.user.id
 * }
 *
 * Expected request body for grid bots (botType === 'grid'):
 * {
 *   botType: 'grid',
 *   accountId: <ObjectId>,
 *   name: <string>,
 *   symbol: <string>,
 *   timeframe: <string>,
 *   riskStrategy: <string>,
 *
 *   // gridConfig must be present (see models/GridBotModel.js)
 *   gridConfig: {
 *     lowerPrice: <number>,
 *     upperPrice: <number>,
 *     gridCount:  <number>,
 *     gridType:  <'fixed'|'percentage'|'infinite'>,      // optional (defaults to 'fixed')
 *     gridStepPercentage: <number>,                      // required if gridType='percentage'
 *     takeProfitPct: <number>,
 *     stopLossPct: <number>,
 *     volatilityBasedSL: <boolean>,
 *     trailingStop: <boolean>,
 *     ATRMultiplier: <number>
 *   },
 *
 *   // And (optionally) tradeInfo/riskParams/marketInfo if you want to override defaults.
 *   // For now, we’ll just fill in tradeInfo.takeProfit and stopLoss from the top‐level payload.
 *
 *   takeProfit: <number>,
 *   stopLoss:  <number>,
 *   leverage:  <number>,
 *
 *   baseFund:  <number>,
 *   tradeFund: <number>,
 *
 *   mode:      'live'   // we still force paper vs. live in code below
 * }
 */
exports.deployBot = async (req, res) => {
    try {
        // 0) Authenticate user
        const user = await User.findById(req.user?.id);
        if (!user) {
            return res.status(401).json({ error: 'User not found.' });
        }

        // 1) Determine which account the user selected
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

        // 2) Extract common fields
        const {
            botType          = 'indicator',  // default to 'indicator' if not provided
            name,
            symbol,
            timeframe,
            riskStrategy,
            takeProfit,
            stopLoss,
            leverage,
            baseFund,
            tradeFund,
            strategy  // indicator‐strategy (default/optimized/dynamic) or ignored for grid
        } = req.body;

        // Capitalize symbol & normalize timeframe
        const normalizedSymbol = (typeof symbol === 'string') ? symbol.toUpperCase() : symbol;
        const normalizedTF     = (typeof timeframe === 'string') ? timeframe.toLowerCase() : timeframe;

        // 3) Build “marketInfo” and “tradeInfo” sub‐objects
        //    If the caller did not explicitly send baseFund/tradeFund, fall back to defaults
        const marketInfo = {
            baseFund:  baseFund  != null ? baseFund  : 10000,
            tradeFund: tradeFund != null ? tradeFund : 50
        };
        const tradeInfo = {
            takeProfit,
            stopLoss,
            leverage: leverage != null ? leverage : 1
        };

        // 4) Branch on botType
        let bot;
        if (botType === 'indicator') {
            //
            // ── I N D I C A T O R   B O T ─────────────────────────────────────────────────
            //
            // a) Parse out “indicator” + “strategyParams” + “additionalIndicators”
            const {
                indicator,            // e.g. 'RSI'
                strategyParams: rawParams,
                additionalIndicators: rawAddIns
            } = req.body;

            if (!indicator || !normalizedTF) {
                return res.status(400).json({ error: 'Indicator name and timeframe are required.' });
            }

            // i) Parse strategyParams JSON if provided as string
            let strategyParams = {};
            if (typeof rawParams === 'string') {
                try {
                    strategyParams = JSON.parse(rawParams);
                } catch {
                    strategyParams = {};
                }
            } else {
                strategyParams = rawParams || {};
            }

            // ii) Build the “indicators” array
            let additionalIndicators = [];
            if (Array.isArray(rawAddIns)) {
                additionalIndicators = rawAddIns;
            } else if (typeof rawAddIns === 'string') {
                try {
                    const parsed = JSON.parse(rawAddIns);
                    if (Array.isArray(parsed)) additionalIndicators = parsed;
                } catch {
                    // ignore
                }
            }

            const indicators = [
                {
                    name:      indicator,
                    timeframe: normalizedTF,
                    params:    strategyParams || defaultStrategyParams[indicator] || {}
                },
                ...additionalIndicators.map(ai => ({
                    name:      ai.indicator,
                    timeframe: ai.timeframe.toLowerCase(),
                    params:    defaultStrategyParams[ai.indicator] || {}
                }))
            ];

            // iii) Create new IndicatorBot document
            bot = await IndicatorBot.create({
                botType:       'indicator',   // discriminatorKey – Mongoose will verify it
                name,
                symbol:        normalizedSymbol,
                timeframe:     normalizedTF,
                userId:        user._id,
                accountType,
                accountId:     account._id,

                riskStrategy,
                riskParams:    {},            // you can fill defaults or allow caller to pass
                marketInfo,
                tradeInfo,

                indicators,
                strategy:      strategy || 'default',

                positionMode:  'single',      // or allow caller to override
                fundMode:      'cross',       // or allow caller to override
                active:        true,
                mode:          'live'
            });
        }
        else if (botType === 'grid') {
            //
            // ── G R I D   B O T ─────────────────────────────────────────────────────────
            //
            // The caller must supply a valid “gridConfig” object in the request body
            const { gridConfig } = req.body;
            if (!gridConfig) {
                return res.status(400).json({ error: 'gridConfig is required for botType=grid.' });
            }

            // Validate minimal required fields in gridConfig
            const { lowerPrice, upperPrice, gridCount } = gridConfig;
            if (
                typeof lowerPrice !== 'number' ||
                typeof upperPrice !== 'number' ||
                typeof gridCount  !== 'number'
            ) {
                return res.status(400).json({
                    error: 'gridConfig must contain numeric lowerPrice, upperPrice, and gridCount.'
                });
            }

            // Create new GridBotModel document
            bot = await GridBotModel.create({
                botType:       'grid',
                name,
                symbol:        normalizedSymbol,
                timeframe:     normalizedTF,
                userId:        user._id,
                accountType,
                accountId:     account._id,

                riskStrategy,
                riskParams:    {},        // fill in or allow caller override
                marketInfo,
                tradeInfo,

                gridConfig:    {
                    lowerPrice:        gridConfig.lowerPrice,
                    upperPrice:        gridConfig.upperPrice,
                    gridCount:         gridConfig.gridCount,
                    gridType:          gridConfig.gridType || 'fixed',
                    gridStepPercentage: gridConfig.gridStepPercentage != null
                        ? gridConfig.gridStepPercentage
                        : 0.01,
                    takeProfitPct:     gridConfig.takeProfitPct != null
                        ? gridConfig.takeProfitPct
                        : 2,
                    stopLossPct:       gridConfig.stopLossPct != null
                        ? gridConfig.stopLossPct
                        : 2,
                    volatilityBasedSL: gridConfig.volatilityBasedSL === true,
                    trailingStop:      gridConfig.trailingStop !== false,
                    ATRMultiplier:     gridConfig.ATRMultiplier != null
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
        return res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Retrieve all bots (indicator + grid) for the current user, enriched with PnL and trades.
 */
exports.getBots = async (req, res) => {
    try {
        const filter = { active: true, userId: req.user?.id };
        // Use BotBase.find() so Mongoose will cast discriminator‐docs automatically
        const bots = await BotBase.find(filter).lean();

        const enriched = await Promise.all(bots.map(async bot => {
            // current price for unrealized PnL
            const price = bot.marketInfo?.currentCandle?.price;
            let pnl = { realized: 0, unrealized: 0, total: 0 };
            if (typeof price === 'number') {
                pnl = await PnLService.getBotPnL(bot._id, price);
            }
            const base = bot.marketInfo?.baseFund || 1;
            const pct  = base > 0 ? (pnl.total / base * 100) : 0;

            // fetch all trades for this bot
            const trades = await Trade
                .find({ bot: bot._id })
                .sort({ timestamp: -1 })
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
        return res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Update a bot’s settings (works for both indicator and grid, as long as req.body matches the discriminator schema).
 */
exports.updateBot = async (req, res) => {
    try {
        // We use BotBase.findById to fetch the existing document (with its discriminator).
        // Then we call .set() + .save() to ensure proper validation on the discriminated model.
        const existing = await BotBase.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Bot not found' });
        }

        // Merge req.body onto the existing Mongoose document
        Object.keys(req.body).forEach(key => {
            existing[key] = req.body[key];
        });

        // Save will run the correct discriminator‐level validators
        const updated = await existing.save();

        // Sync in‐memory registration
        if (updated.active) {
            BotService.updateBot(updated);
        } else {
            BotService.removeBot(updated);
        }

        return res.json({ success: true, bot: updated });
    }
    catch (err) {
        console.error('updateBot error:', err);
        return res.status(400).json({ success: false, error: err.message });
    }
};

/**
 * Delete a bot completely.
 */
exports.deleteBot = async (req, res) => {
    try {
        const bot = await BotBase.findByIdAndDelete(req.params.id);
        if (!bot) {
            return res.status(404).json({ success: false, error: 'Bot not found' });
        }

        BotService.removeBot(bot);
        return res.json({ success: true, message: `"${bot.name}" deleted.` });
    }
    catch (err) {
        console.error('deleteBot error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Ensure bots for a symbol/timeframe (upsert). This only creates/upserts indicator‐type bots.
 */
exports.selectBots = async (req, res) => {
    try {
        let { symbol, timeframe, strategy } = req.query;
        if (!symbol || !timeframe) {
            return res.status(400).json({ success: false, error: 'Symbol and timeframe are required' });
        }
        symbol    = symbol.toString().toUpperCase();
        timeframe = timeframe.toString().toLowerCase();

        // If caller passed a specific indicator name in `strategy`, use it; otherwise, default list:
        const list = strategy
            ? [ strategy ]
            : ['MA_Crossover','RSI','MACD'];

        // Upsert indicator‐type bots for each name in `list`
        for (const ind of list) {
            const indicatorsArray = [
                {
                    name:      ind,
                    timeframe,
                    params:    defaultStrategyParams[ind] || {}
                }
            ];

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

        // Return all bots (indicator OR grid) for symbol/timeframe
        const bots = await BotBase.find({ symbol, timeframe }).lean();
        return res.json({ success: true, bots });
    }
    catch (err) {
        console.error('selectBots error:', err);
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
        return res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Provide front‐end with various dropdown properties (unchanged).
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
