// controllers/pnlController.js
const Bot       = require('../../models/BotBase');
const Trade     = require('../../models/Trade');
const BinanceAccount = require('../../models/BinanceAccount');
const OkxAccount     = require('../../models/OkxAccount');
const moment    = require('moment');
const logger    = require('../../../logs/logger');

const BinanceService = require('../../services/binanceWS');
const OkxService     = require('../../services/okxWS');

const FORMAT_MAP = {
    '1D': 'HH:mm',
    '1W': 'ddd DD',
    '1M': 'DD MMM',
    '1Y': 'MMM YYYY'
};

/**
 * GET /api/pnl/realized?period=1D|1W|1M|1Y
 */
exports.getRealizedPnL = async (req, res) => {
    const userId = req.user.id;
    const period = (req.query.period || '1D').toUpperCase();

    try {
        // --- 1) LOCAL closed trades ---
        const bots   = await Bot.find({ userId }).lean();
        const botIds = bots.map(b => b._id);
        let local = await Trade.find({
            bot:       { $in: botIds },
            exitPrice: { $ne: null }
        })
            .select('timestamp profit')
            .lean();
        local.sort((a,b) => b.timestamp - a.timestamp);
        let latest = local.slice(0, 7).map(t => ({
            timestamp: t.timestamp,
            profit:    t.profit
        }));

        // --- 2) REMOTE if we need more ---
        if (latest.length < 7) {
            const missing = 7 - latest.length;

            // load API accounts
            const [binAccts, okxAccts] = await Promise.all([
                BinanceAccount.find({ userId }).lean(),
                OkxAccount.find({ userId }).lean()
            ]);

            // call each service
            const remoteArrays = await Promise.all([
                ...binAccts.map(a => BinanceService.getHistoricalRealizedPnL(a, { days: missing })),
                ...okxAccts.map(a => OkxService.getHistoricalRealizedPnL(a, { days: missing }))
            ]);
            const remote = remoteArrays.flat();

            // merge & dedupe by timestamp
            const merged = [ ...latest, ...remote ]
                .reduce((acc, p) => {
                    if (!acc.find(x => x.timestamp === p.timestamp)) acc.push(p);
                    return acc;
                }, [])
                .sort((a,b) => b.timestamp - a.timestamp);

            latest = merged.slice(0, 7);
        }

        // --- 3) FORMAT for output (oldest→newest) ---
        const fmt  = FORMAT_MAP[period] || FORMAT_MAP['1D'];
        const data = latest
            .slice().reverse()
            .map(p => ({
                date:  moment(p.timestamp).format(fmt),
                value: parseFloat(p.profit.toFixed(2))
            }));

        return res.json({ success: true, data });
    }
    catch (err) {
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

    try {
        // --- 1) LOCAL open trades → compute % PnL ---
        const bots    = await Bot.find({ userId }).lean();
        const botMap  = Object.fromEntries(bots.map(b => [b._id.toString(), b]));
        let local = (await Trade.find({
            bot:       { $in: bots.map(b => b._id) },
            exitPrice: null
        })
            .select('bot entryPrice timestamp')
            .lean())
            .map(t => {
                const bot = botMap[t.bot.toString()];
                const cur = bot.marketInfo?.currentCandle?.price;
                if (!cur) return null;
                return {
                    timestamp: t.timestamp,
                    pct:       ((cur - t.entryPrice) / t.entryPrice) * 100
                };
            })
            .filter(x => x !== null);

        local.sort((a,b) => b.timestamp - a.timestamp);
        let latest = local.slice(0, 7);

        // --- 2) REMOTE if we need more ---
        if (latest.length < 7) {
            const missing = 7 - latest.length;

            const [binAccts, okxAccts] = await Promise.all([
                BinanceAccount.find({ userId }).lean(),
                OkxAccount.find({ userId }).lean()
            ]);

            const remoteArrays = await Promise.all([
                ...binAccts.map(a => BinanceService.getUnrealizedPnLHistory(a, { days: missing })),
                ...okxAccts.map(a => OkxService.getUnrealizedPnLHistory(a, { days: missing }))
            ]);
            const remote = remoteArrays.flat();

            const merged = [ ...latest, ...remote ]
                .reduce((acc, p) => {
                    if (!acc.find(x => x.timestamp === p.timestamp)) acc.push(p);
                    return acc;
                }, [])
                .sort((a,b) => b.timestamp - a.timestamp);

            latest = merged.slice(0, 7);
        }

        // --- 3) FORMAT for output (newest first as “bar” names) ---
        const data = latest.map(p => ({
            name: `Pos ${moment(p.timestamp).format('MMDD')}`,
            pct:  parseFloat(p.pct.toFixed(2))
        }));

        return res.json({ success: true, data });
    }
    catch (err) {
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
