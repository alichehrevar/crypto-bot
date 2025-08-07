// app/http/controllers/pnlController.js
const Bot       = require('../../models/BotBase');
const Trade     = require('../../models/Trade');

const BinanceAccount = require('../../models/BinanceAccount');
const OkxAccount     = require('../../models/OkxAccount');
const BingxAccount     = require('../../models/BingxAccount');

const moment    = require('moment');
const logger    = require('../../../logs/logger');

const BinanceService = require('../../services/binanceWS');
const OkxService     = require('../../services/okxWS');
const BingxService = require('../../services/bingXWS');

/**
 * @description A map to determine the date format for the chart based on the selected period.
 */
const FORMAT_MAP = {
    '1D': 'HH:mm',
    '1W': 'ddd DD',
    '1M': 'DD MMM',
    '1Y': 'MMM YYYY'
};

/**
 * @description Helper function to convert a period string (e.g., '1W') into a number of days.
 * @param {string} period - The period string ('1D', '1W', '1M', '1Y').
 * @returns {number} The corresponding number of days.
 */
const periodToDays = (period) => {
    switch (period) {
        case '1W': return 7;
        case '1M': return 30;
        case '1Y': return 365;
        case '1D':
        default: return 1;
    }
};

/**
 * @description GET /api/pnl/realized?period=1D|1W|1M|1Y
 * Fetches realized PnL from both the local database and remote exchanges for the specified period.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
exports.getRealizedPnL = async (req, res) => {
    const userId = req.user.id;
    const period = (req.query.period || '1W').toUpperCase(); // Default to 1 week
    const accountType = req.query.accountType;  // e.g., 'spot' or 'futures'
    const days = periodToDays(period); // Convert period to days
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    try {
        // --- 1) Filter bots based on the requested accountType ---
        const botFilter = { userId };
        if (accountType) {
            botFilter.marketType = accountType; // Assuming your Bot model has 'marketType'
        }
        const bots = await Bot.find(botFilter).lean();
        const botIds = bots.map(b => b._id);

        // --- 2) Fetch LOCAL closed trades ---
        const localTrades = await Trade.find({
            bot: { $in: botIds },
            exitPrice: { $ne: null },
            timestamp: { $gte: sinceDate }
        }).select('timestamp profit').lean();

        // --- 3) Fetch REMOTE closed trades ---
        // (This logic remains largely the same, but now implicitly filtered by the bots' accounts)
        const [binAccts, okxAccts, bingxAccts] = await Promise.all([
            BinanceAccount.find({ userId }).lean(),
            OkxAccount.find({ userId }).lean(),
            BingxAccount.find({ userId }).lean()
        ]);

        const remoteArrays = await Promise.all([
            ...binAccts.map(a => BinanceService.getHistoricalRealizedPnL(a, { days })),
            ...okxAccts.map(a => OkxService.getHistoricalRealizedPnL(a, { days })),
            ...bingxAccts.map(a => BingxService.getHistoricalRealizedPnL(a, { days }))
        ]);
        const remoteTrades = remoteArrays.flat();

        // --- 3) Merge, Deduplicate, Sort, and Format for Output ---
        const merged = [...localTrades, ...remoteTrades]
            .reduce((acc, p) => {
                // Simple deduplication by timestamp
                if (!acc.find(x => x.timestamp.getTime() === p.timestamp.getTime())) {
                    acc.push(p);
                }
                return acc;
            }, [])
            .sort((a, b) => a.timestamp - b.timestamp); // Sort oldest to newest for the chart

        const fmt = FORMAT_MAP[period] || FORMAT_MAP['1W'];
        const data = merged.map(p => ({
            date: moment(p.timestamp).format(fmt),
            value: parseFloat(p.profit.toFixed(2))
        }));

        return res.json({ success: true, data });
    } catch (err) {
        console.error('getRealizedPnL error', err);
        logger.error(`getRealizedPnL error: ${err.message}`, { stack: err.stack });
        return res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * @description GET /api/pnl/unrealized
 * Fetches a snapshot of current unrealized PnL from open positions.
 * Note: The 'period' parameter does not affect this endpoint as it returns a live snapshot.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
exports.getUnrealizedPnL = async (req, res) => {
    const userId = req.user.id;
    const period = (req.query.period || '1W').toUpperCase();
    const accountType = req.query.accountType;
    const days = periodToDays(period);
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    try {
        // --- 1) Filter bots and fetch LOCAL open trades within the period ---
        const botFilter = { userId };
        if (accountType) {
            botFilter.marketType = accountType;
        }
        const bots = await Bot.find(botFilter).lean();
        const botMap = Object.fromEntries(bots.map(b => [b._id.toString(), b]));

        const localOpenTrades = (await Trade.find({
            bot: { $in: bots.map(b => b._id) },
            exitPrice: null,
            timestamp: { $gte: sinceDate } // Filter by open date
        }).lean()).map(t => {
                const bot = botMap[t.bot.toString()];
                const currentPrice = bot?.marketInfo?.currentCandle?.price;
                if (!currentPrice) return null;
                return {
                    name: `Pos ${moment(t.timestamp).format('MMDD')}`,
                    pct: ((currentPrice - t.entryPrice) / t.entryPrice) * 100
                };
            }).filter(x => x !== null);

        // --- 2) Fetch REMOTE open positions from exchanges ---
        const [binAccts, okxAccts, bingxAccts] = await Promise.all([
            BinanceAccount.find({ userId }).lean(),
            OkxAccount.find({ userId }).lean(),
            BingxAccount.find({ userId }).lean()
        ]);

        const remoteArrays = await Promise.all([
            ...binAccts.map(a => BinanceService.getUnrealizedPnLHistory(a, {})),
            ...okxAccts.map(a => OkxService.getUnrealizedPnLHistory(a, {})),
            ...bingxAccts.map(a => BingxService.getUnrealizedPnLHistory(a, {}))
        ]);

        // Filter remote positions by the creation timestamp
        const remoteOpenPositions = remoteArrays.flat().filter(p => p.timestamp >= sinceDate.getTime());

        // --- 3) Merge and Format for Output ---
        const allPositions = [...localOpenTrades, ...remoteOpenPositions];
        const data = allPositions.map(p => ({
            ...p,
            pct: parseFloat(p.pct.toFixed(2))
        }));

        return res.json({ success: true, data });
    } catch (err) {
        console.error('getUnrealizedPnL error', err);
        logger.error(`getUnrealizedPnL error: ${err.message}`, { stack: err.stack });
        return res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * @description GET /api/pnl/all
 * Fetches all of a user's trades by merging local database records with live data
 * fetched directly from their linked exchange accounts (Binance, OKX, BingX).
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
exports.getAllPnL = async (req, res) => {
    try {
        const userId = req.user.id;

        // --- 1. Load Local Data (Bots and Trades from your DB) ---
        // This gives us our application-specific context like strategy names.
        console.log('[getAllPnL] Step 1: Loading local bots and trades...');
        const bots = await Bot.find({ userId, active: true }).lean();
        const botMap = bots.reduce((m, b) => {
            m[b._id.toString()] = b;
            return m;
        }, {});

        const localTrades = await Trade.find({
            bot: { $in: bots.map(b => b._id) }
        }).lean();

        // --- 2. Load Remote Data (Live PnL from Exchange APIs) ---
        console.log('[getAllPnL] Step 2: Loading remote data from exchanges...');
        // First, get all linked accounts for the user.
        const [binanceAccts, okxAccts, bingxAccts] = await Promise.all([
            BinanceAccount.find({ userId }).lean(),
            OkxAccount.find({ userId }).lean(),
            BingxAccount.find({ userId }).lean()
        ]);

        // Fetch all open positions (unrealized PnL) and recent closed trades (realized PnL)
        const remoteDataPromises = [
            // Unrealized PnL (Open Positions)
            ...binanceAccts.map(a => BinanceService.getUnrealizedPnLHistory(a, {})),
            ...okxAccts.map(a => OkxService.getUnrealizedPnLHistory(a, {})),
            ...bingxAccts.map(a => BingxService.getUnrealizedPnLHistory(a, {})),
            // Realized PnL (Closed Trades History)
            ...binanceAccts.map(a => BinanceService.getHistoricalRealizedPnL(a, { days: 7 })),
            ...okxAccts.map(a => OkxService.getHistoricalRealizedPnL(a, { days: 7 })),
            ...bingxAccts.map(a => BingxService.getHistoricalRealizedPnL(a, { days: 7 })),
        ];

        const remoteResults = await Promise.all(remoteDataPromises);
        // The structure of getUnrealizedPnLHistory gives an array of positions.
        // We assume the first half of results are unrealized, second half are realized.
        const midpoint = remoteDataPromises.length / 2;
        const remoteOpenPositions = remoteResults.slice(0, midpoint).flat();
        const remoteClosedTrades = remoteResults.slice(midpoint).flat();

        // --- 3. Merge and Reconcile Data ---
        console.log('[getAllPnL] Step 3: Merging local and remote data...');
        const open = [];
        const closed = [];

        // Process local trades first
        localTrades.forEach(t => {
            const bot = botMap[t.bot.toString()] || {};
            const pnlPct = t.exitPrice != null
                ? `${(((t.exitPrice - t.entryPrice) / t.entryPrice) * 100).toFixed(2)}%`
                : '...'; // Placeholder for unrealized, to be updated by remote data if available

            const row = {
                symbol: bot.symbol || 'N/A',
                broker: bot.broker || 'N/A',
                execution: bot.name || 'N/A',
                strategy: bot.riskStrategy || 'N/A',
                leverage: bot.tradeInfo?.leverage ? `x ${bot.tradeInfo.leverage}` : '',
                tpsl: (bot.tradeInfo?.takeProfit != null && bot.tradeInfo?.stopLoss != null)
                    ? `${bot.tradeInfo.takeProfit}% / ${bot.tradeInfo.stopLoss}%` : '',
                unrealizedPnl: pnlPct,
                // Note: The type defines 'closed' array items with 'unrealizedPnl', so we will use that field name.
            };

            if (t.exitPrice == null) {
                open.push(row);
            } else {
                closed.push(row);
            }
        });

        // Augment with remote data
        // Here we can enrich the open positions with live PnL or add positions opened manually.
        // This is a simplified example. A full reconciliation might involve matching trades by symbol.
        remoteOpenPositions.forEach(pos => {
            // For now, we add them as separate entries if they exist.
            open.push({
                symbol: pos.symbol || 'N/A', // Exchange data might format symbol differently
                broker: 'Remote', // Placeholder
                execution: 'Manual/Remote',
                strategy: 'N/A',
                leverage: pos.leverage ? `x ${pos.leverage}` : '',
                tpsl: '',
                unrealizedPnl: `${pos.pct >= 0 ? '+' : ''}${pos.pct}%`
            });
        });

        remoteClosedTrades.forEach(trade => {
            closed.push({
                symbol: 'N/A',
                broker: 'Remote',
                execution: 'Trade History',
                strategy: 'N/A',
                leverage: '',
                tpsl: '',
                unrealizedPnl: `${trade.profit >= 0 ? '+' : ''}${trade.profit.toFixed(2)} USD`, // Assuming profit is in USD
            });
        });

        // --- 4. Format and Return ---
        return res.json({ success: true, data: { open, closed } });
    }
    catch (err) {
        console.error('getAllPnL error:', err);
        logger.error(`getAllPnL error: ${err.message}`, { stack: err.stack });
        return res.status(500).json({ success: false, error: 'Failed to fetch all PnL data.' });
    }
};
