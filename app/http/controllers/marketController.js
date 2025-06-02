// controllers/marketController.js

const MarketService = require('../../services/MarketService');
const Currency      = require('../../models/Currency');
const logger = require("../../../logs/logger");

/**
 * GET /api/market/top-movers
 * Query params:
 *   - limit: how many symbols to return (default 5)
 *   - direction: 'desc' for top gainers, 'asc' for top losers (default 'desc')
 */
exports.getTopMovers = async (req, res) => {
    try {
        const limit     = parseInt(req.query.limit, 10) || 5;
        const direction = req.query.direction === 'asc' ? 'asc' : 'desc';

        // Fetch the raw movers from Binance via MarketService
        const movers = await MarketService.getTopMovers(limit, direction);

        // Enrich with imageUrl from your Currency collection (if you stored one)
        const symbols = movers.map(m => m.symbol);
        const currencies = await Currency.find({ symbol: { $in: symbols } })
            .select('symbol imageUrl')
            .lean();

        const lookup = currencies.reduce((acc, cur) => {
            acc[cur.symbol] = cur.imageUrl;
            return acc;
        }, {});

        const enriched = movers.map(m => ({
            ...m,
            imageUrl:
                lookup[m.symbol] ||
                // fallback to the popular crypto‐icons CDN
                `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/${m.symbol
                    .split('/')[0]
                    .toLowerCase()}.png`
        }));

        res.json({ success: true, data: enriched });
    } catch (err) {
        console.error('getTopMovers error:', err);
        logger.error(`getTopMovers error: ${err.message}`, { stack: err.stack });
        res.status(500).json({ success: false, error: err.message });
    }
};
