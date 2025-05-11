// app/http/controllers/botController.js

const Bot        = require('../../models/Bot');
const User       = require('../../models/User');
const Trade      = require('../../models/Trade');
const Candle     = require('../../models/Candle');
const BinanceAccount = require('../../models/BinanceAccount')
const OkxAccount     = require('../../models/OkxAccount')
const BingxAccount   = require('../../models/BingxAccount')
const BotService = require('../../services/botService/BotService');
const PnLService = require('../../services/PnLService');      // for getBots enrichment

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
 * Deploy a new bot.
 */
exports.deployBot = async (req, res) => {
    try {
        const user = await User.findById(req.user?.id);
        if (!user) return res.status(401).json({ error: 'User not found.' });

        // pull raw values out of the body
        const {
            accountId, name, symbol, baseFund, tradeFund, leverage,
            riskStrategy, takeProfit, stopLoss,
            indicator, timeframe,
            strategyParams: rawParams,
            additionalIndicators: rawAddIns
        } = req.body;

        // 1) parse strategyParams if it's a JSON string
        let strategyParams;
        if (typeof rawParams === 'string') {
            try {
                strategyParams = JSON.parse(rawParams);
            } catch {
                strategyParams = {};
            }
        } else {
            strategyParams = rawParams || {};
        }

        // 2) coerce additionalIndicators into an array of objects
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

        // find the right account…
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

        // 3) build your indicators array
        const indicators = [
            {
                name:      indicator,
                timeframe,
                params:    strategyParams || defaultStrategyParams[indicator] || {}
            },
            ...additionalIndicators.map(ai => ({
                name:      ai.indicator,
                timeframe: ai.timeframe,
                params:    defaultStrategyParams[ai.indicator] || {}
            }))
        ];

        // 4) finally create the bot
        const bot = await Bot.create({
            name,
            symbol,
            timeframe,
            indicators,
            riskStrategy,
            tradeInfo:   { takeProfit, stopLoss, leverage },
            marketInfo:  {
                baseFund:  baseFund  != null ? baseFund  : 10000,
                tradeFund: tradeFund != null ? tradeFund : 50
            },
            accountType,
            accountId: account._id,
            userId:    user._id,
            mode:      'live',
            active:    true
        });

        // register it in memory
        BotService.registerBot(bot);

        return res.status(201).json({ success: true, bot });
    } catch (err) {
        console.error('deployBot error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Retrieve all bots, enriched with PnL and trades.
 */
exports.getBots = async (req, res) => {
    try {
        const filter = { active: true, userId: req.user?.id };
        const bots = await Bot.find(filter).lean();

        const enriched = await Promise.all(bots.map(async bot => {
            // current price for unrealized
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
 * Retrieve one bot by ID.
 */
exports.getBotById = async (req, res) => {
    try {
        const bot = await Bot.findById(req.params.id).lean();
        if (!bot) return res.status(404).json({ success: false, error: 'Bot not found' });
        return res.json({ success: true, bot });
    }
    catch (err) {
        console.error('getBotById error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Update a bot’s settings.
 */
exports.updateBot = async (req, res) => {
    try {
        const bot = await Bot.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if (!bot) return res.status(404).json({ success: false, error: 'Bot not found' });

        // sync memory
        if (bot.active) BotService.updateBot(bot);
        else           BotService.removeBot(bot);

        return res.json({ success: true, bot });
    }
    catch (err) {
        console.error('updateBot error:', err);
        return res.status(400).json({ success: false, error: err.message });
    }
};

/**
 * Delete a bot.
 */
exports.deleteBot = async (req, res) => {
    try {
        const bot = await Bot.findByIdAndDelete(req.params.id);
        if (!bot) return res.status(404).json({ success: false, error: 'Bot not found' });

        BotService.removeBot(bot);
        return res.json({ success: true });
    }
    catch (err) {
        console.error('deleteBot error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Ensure bots for a symbol/timeframe.
 */
exports.selectBots = async (req, res) => {
    try {
        let { symbol, timeframe, strategy } = req.query;
        if (!symbol || !timeframe) {
            return res.status(400).json({ success: false, error: 'Symbol and timeframe are required' });
        }
        symbol    = symbol.toString().toUpperCase();
        timeframe = timeframe.toString().toLowerCase();

        const list = strategy
            ? [ strategy ]
            : ['MA_Crossover','RSI','MACD'];

        for (const ind of list) {
            await Bot.findOneAndUpdate(
                { symbol, timeframe, 'indicators.name': ind },
                {
                    $set: {
                        name:       `${symbol} ${timeframe} ${ind} Bot`,
                        indicators: [ { name: ind, timeframe, params: defaultStrategyParams[ind] || {} } ],
                        riskStrategy: 'SimpleStrategy',
                        tradeInfo:    { leverage: 1 },
                        marketInfo:   { baseFund:10000, tradeFund:50 },
                        active:       true,
                        mode:         'paper'
                    }
                },
                { upsert: true, new: true }
            );
        }

        const bots = await Bot.find({ symbol, timeframe }).lean();
        return res.json({ success: true, bots });
    }
    catch (err) {
        console.error('selectBots error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Pause a bot (stop it from trading, but keep it in the list).
 */
exports.pauseBot = async (req, res) => {
    try {
        const bot = await Bot.findById(req.params.id);
        if (!bot) return res.status(404).json({ success: false, error: 'Bot not found' });

        bot.active = false;
        await bot.save();

        // Also remove it from in-memory processing
        BotService.removeBot(bot);

        res.json({ success: true, message: `"${bot.name}" paused.` });
    } catch (err) {
        console.error('pauseBot error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Resume a bot (reactivate trading).
 */
exports.resumeBot = async (req, res) => {
    try {
        const bot = await Bot.findById(req.params.id);
        if (!bot) return res.status(404).json({ success: false, error: 'Bot not found' });

        bot.active = true;
        await bot.save();

        // Re-register in in-memory engine
        BotService.registerBot(bot);

        res.json({ success: true, message: `"${bot.name}" resumed.` });
    } catch (err) {
        console.error('resumeBot error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Close (delete) a bot entirely.
 * You already have deleteBot, but ensure you also remove it from BotService.
 */
exports.deleteBot = async (req, res) => {
    try {
        const bot = await Bot.findByIdAndDelete(req.params.id);
        if (!bot) return res.status(404).json({ success: false, error: 'Bot not found' });

        BotService.removeBot(bot);
        res.json({ success: true, message: `"${bot.name}" deleted.` });
    } catch (err) {
        console.error('deleteBot error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Close an open trade.
 */
exports.closeTrade = async (req, res) => {
    try {
        const { botId, tradeId } = req.params;
        const { exitPrice: bodyExit } = req.body;

        // 1) load bot & trade
        const bot   = await Bot.findById(botId);
        if (!bot)   return res.status(404).json({ success: false, error: 'Bot not found' });

        const trade = await Trade.findById(tradeId);
        if (!trade) return res.status(404).json({ success: false, error: 'Trade not found' });
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

        // check bot-level TP/SL
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
