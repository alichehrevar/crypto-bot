// controllers/pnlController.js
const Bot = require('../../models/BotBase');
const Trade = require('../../models/Trade');
const moment = require('moment');
const logger = require("../../../logs/logger");

const FORMAT_MAP = {
    '1D': 'HH:mm',   // show time
    '1W': 'ddd DD',  // Mon 01
    '1M': 'DD MMM',  // 15 Mar
    '1Y': 'MMM YYYY' // Mar 2025
};

/**
 * GET /api/pnl/realized?period=1D|1W|1M|1Y
 */
exports.getRealizedPnL = async (req, res) => {
    const userId = req.user.id;
    const period = (req.query.period || '1D').toUpperCase();

    try {
        // 1) load all bots for this user
        const bots   = await Bot.find({ userId }).lean();
        const botIds = bots.map(b => b._id);

        // 2) fetch all closed trades for those bots
        const trades = await Trade.find({
            bot:       { $in: botIds },
            exitPrice: { $ne: null }
        })
            .select('timestamp profit')
            .lean();

        // 3) sort by timestamp desc, take latest 7, then reverse to chronological
        trades.sort((a, b) => b.timestamp - a.timestamp);
        const last7 = trades.slice(0, 7).reverse();

        // 4) format according to period
        const fmt  = FORMAT_MAP[period] || FORMAT_MAP['1D'];
        const data = last7.map(t => ({
            date:  moment(t.timestamp).format(fmt),
            value: t.profit
        }));

        return res.json({ success: true, data });

    } catch (err) {
        console.error('getRealizedPnL error', err);
        logger.error(`getRealizedPnL error: ${err.message}`, { stack: err.stack });
        return res.status(500).json({ success: false, error: err.message });
    }
};


/**
 * GET /api/pnl/unrealized?period=1D|1W|1M|1Y
 */
exports.getUnrealizedPnL = async (req, res) => {
    const userId = req.user.id;
    // period is ignored here for grouping, but you could use it to bucket by age
    try {
        // 1) load all bots
        const bots   = await Bot.find({ userId }).lean();
        const botMap = Object.fromEntries(bots.map(b => [b._id.toString(), b]));
        const botIds = Object.keys(botMap);

        // 2) fetch all open trades for those bots
        const trades = await Trade.find({
            bot:       { $in: botIds },
            exitPrice: null
        })
            .select('bot entryPrice timestamp')
            .lean();

        // 3) compute % pnl using each bot's currentCandle.price
        const openWithPct = trades
            .map(t => {
                const bot       = botMap[t.bot.toString()];
                const curPrice  = bot.marketInfo?.currentCandle?.price;
                if (!curPrice) return null;
                const pct = ((curPrice - t.entryPrice) / t.entryPrice) * 100;
                return {
                    timestamp: t.timestamp,
                    name:      `Position ${t._id.toString().slice(-4)}`, // or however you want to label
                    pct:       parseFloat(pct.toFixed(2))
                };
            })
            .filter(x => x !== null);

        // 4) sort desc, take latest 7
        openWithPct.sort((a, b) => b.timestamp - a.timestamp);
        const last7 = openWithPct.slice(0, 7);

        // 5) output
        const data = last7.map(t => ({ name: t.name, pct: t.pct }));

        return res.json({ success: true, data });

    } catch (err) {
        console.error('getUnrealizedPnL error', err);
        logger.error(`getUnrealizedPnL error: ${err.message}`, { stack: err.stack });
        return res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * GET /api/pnl/all
 *
 * Returns every trade, grouped into open vs. closed, and enriched with:
 *   • symbol        – from the bot
 *   • broker        – e.g. “OKX” or “Binance”
 *   • execution     – bot name (e.g. “DCA bot”)
 *   • strategy      – strategy name (e.g. “Dynamic”)
 *   • leverage      – “x 20”
 *   • tpsl          – “50% / 50%”
 *   • unrealizedPnl – “+0.01%” (for open trades)
 *   • realizedPnl   – “+2.34%” (for closed trades)
 *   • action        – “Close” (for open) or “Reopen” (for closed)
 */
exports.getAllPnL = async (req, res) => {
    try {
        const userId = req.user.id;

        // 1) load all this user’s bots
        const bots = await Bot.find({ userId }).lean();
        const botMap = bots.reduce((m, b) => {
            m[b._id.toString()] = b;
            return m;
        }, {});

        // 2) fetch every trade for those bots
        const trades = await Trade.find({
            bot: { $in: bots.map(b => b._id) }
        }).lean();

        // 3) build rows
        const open  = [];
        const closed = [];

        trades.forEach(t => {
            const bot = botMap[t.bot.toString()] || {};

            // from your demo:
            const symbol    = bot.symbol || '';
            const broker    = bot.broker || bot.accountType || '';
            const execution = bot.name   || bot.executionName || '';
            const strategy  = bot.strategyName   || bot.strategy  || '';
            const ro         = bot.tradeInfo || {};
            const leverage  = ro.leverage
                ? `x ${ro.leverage}`
                : '';
            const tpsl      = (ro.takeProfit != null && ro.stopLoss != null)
                ? `${ro.takeProfit}% / ${ro.stopLoss}%`
                : '';

            // compute a % PnL
            let pnlPct = '';
            if (t.exitPrice != null) {
                // realized
                const diff = ((t.exitPrice - t.entryPrice) / t.entryPrice) * 100;
                pnlPct = `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}%`;
            } else {
                // unrealized: use current market price
                const cur = bot.marketInfo?.currentCandle?.price;
                if (cur != null) {
                    const diff = ((cur - t.entryPrice) / t.entryPrice) * 100;
                    pnlPct = `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}%`;
                }
            }

            const row = {
                symbol,
                broker,
                execution,
                strategy,
                leverage,
                tpsl,
                action:  t.exitPrice == null ? 'Close' : 'Reopen',
                // put the pct on the right field:
                ...(t.exitPrice == null
                    ? { unrealizedPnl: pnlPct }
                    : { realizedPnl:   pnlPct })
            };

            if (t.exitPrice == null) open.push(row);
            else closed.push(row);
        });

        return res.json({ success: true, data: { open, closed } });
    }
    catch (err) {
        console.error('getAllPnL error', err);
        return res.status(500).json({ success: false, error: err.message });
    }
};
