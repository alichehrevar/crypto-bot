// app/http/controllers/botController.js

const Bot         = require('../../models/Bot');
const User        = require('../../models/User');
const Trade      = require('../../models/Trade');
const BotService  = require('../../services/botService/BotService');
const PnLService  = require('../../services/PnLService');

const defaultStrategyParams = {
    RSI:               { period: 14, overbought: 70, oversold: 30 },
    MACD:              { shortPeriod: 12, longPeriod: 26, signalPeriod: 9 },
    MA_Crossover:      { shortPeriod: 5,  longPeriod: 20 },
    Donchian:          { period: 20 },
    Volume:            { period: 14 },
    Heikin_Ashi:       {},
    Combined_RSI_MACD: { parameters: { confirmation_window: 6 } },
    Bollinger_Bands:   { period: 20, stdDev: 2 },
    Stochastic_RSI:    { period: 14, kPeriod: 3, dPeriod: 3 }
};

/**
 * Deploy a new bot.
 */
exports.deployBot = async (req, res) => {
    try {
        const user = await User.findById(req.user?.id);
        if (!user) return res.status(401).json({ error: 'User not found.' });

        const {
            name, symbol, baseFund, tradeFund, leverage,
            riskStrategy, takeProfit, stopLoss,
            indicator, timeframe, strategyParams,
            additionalIndicators = []
        } = req.body;

        // Build multi‐indicator array
        const indicators = [
            {
                name:      indicator,
                timeframe,
                params:    strategyParams   || defaultStrategyParams[indicator]   || {}
            },
            ...additionalIndicators.map(ai => ({
                name:      ai.indicator,
                timeframe: ai.timeframe,
                params:    defaultStrategyParams[ai.indicator] || {}
            }))
        ];

        const bot = await Bot.create({
            name,
            symbol,
            timeframe,
            indicators,
            riskStrategy,
            tradeInfo: { takeProfit, stopLoss, leverage },
            marketInfo: {
                baseFund:  baseFund  != null ? baseFund  : 10000,
                tradeFund: tradeFund != null ? tradeFund : 50
            },
            userId: user._id,
            mode:   'live',
            active: true
        });

        // register in memory
        BotService.registerBot(bot);

        res.status(201).json(bot);
    } catch (err) {
        console.error('Error deploying bot:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Retrieve all bots for this user (or globally).
 * Enriches each bot with realized/unrealized/total PnL and PnL%.
 */
exports.getBots = async (req, res) => {
    try {
        // adjust filter as needed (e.g. by user)
        const filter = { active: true, userId: req.user?.id };
        const bots = await Bot.find(filter).lean();

        const enriched = await Promise.all(bots.map(async bot => {
            const price = bot.marketInfo?.currentCandle?.price;
            let pnl = { realized: 0, unrealized: 0, total: 0 };
            if (typeof price === 'number') {
                pnl = await PnLService.getBotPnL(bot._id, price);
            }
            const base = bot.marketInfo?.baseFund || 1;
            const pct  = base > 0 ? (pnl.total / base) * 100 : 0;

            // Fetch trades for this bot
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

        res.json({ success: true, bots: enriched });
    } catch (err) {
        console.error('getBots error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Retrieve a single bot by ID.
 */
exports.getBotById = async (req, res) => {
    try {
        const bot = await Bot.findById(req.params.id).lean();
        if (!bot) return res.status(404).json({ error: 'Bot not found' });
        res.json({ success: true, bot });
    } catch (err) {
        console.error('getBotById error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Update an existing bot.
 */
exports.updateBot = async (req, res) => {
    try {
        const bot = await Bot.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if (!bot) return res.status(404).json({ error: 'Bot not found' });

        // sync memory
        if (bot.active)      BotService.updateBot(bot);
        else                 BotService.removeBot(bot);

        res.json({ success: true, bot });
    } catch (err) {
        console.error('updateBot error:', err);
        res.status(400).json({ success: false, error: err.message });
    }
};

/**
 * Delete a bot.
 */
exports.deleteBot = async (req, res) => {
    try {
        const bot = await Bot.findByIdAndDelete(req.params.id);
        if (!bot) return res.status(404).json({ error: 'Bot not found' });

        BotService.removeBot(bot);
        res.json({ success: true });
    } catch (err) {
        console.error('deleteBot error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * (Optional) selectBots: bulk‐ensure bots for a symbol/timeframe.
 * Fixed lookup to use our defaultStrategyParams.
 */
exports.selectBots = async (req, res) => {
    try {
        let { symbol, timeframe, strategy } = req.query;
        if (!symbol || !timeframe) {
            return res.status(400).json({ error: 'Symbol and timeframe are required' });
        }

        // normalize symbol/timeframe...
        symbol    = symbol.toString().toUpperCase();
        timeframe = timeframe.toString().toLowerCase();

        const indicators = strategy
            ? [strategy]
            : ['MA_Crossover','RSI','MACD'];

        for (const ind of indicators) {
            await Bot.findOneAndUpdate(
                { symbol, timeframe, strategy: ind },
                {
                    $set: {
                        name:           `${symbol} ${timeframe} ${ind} Bot`,
                        indicators:     [ { name: ind, timeframe, params: defaultStrategyParams[ind] || {} } ],
                        riskStrategy:   'SimpleStrategy',
                        tradeInfo:      { leverage: 1 },
                        marketInfo:     { baseFund:10000, tradeFund:50 },
                        active:         true,
                        mode:           'paper'
                    }
                },
                { upsert: true, new: true }
            );
        }

        const bots = await Bot.find({ symbol, timeframe });
        res.json({ success: true, bots });
    } catch (err) {
        console.error('selectBots error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};
