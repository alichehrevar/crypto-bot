// app/http/controllers/marketController.js

const MarketService = require('../../services/marketService');
const Currency      = require('../../models/Currency');
const MarketSnapshot = require('../../models/MarketSnapshot');
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

exports.getMarketList = async (req, res) => {
    try {
        const coins = await MarketSnapshot.find().sort({ rank: 1 });
        res.status(200).json({data: coins, success: true});
    } catch (error) {
        console.error('Market list error:', error);
        res.status(500).json({ message: 'Failed to load market list', success: false });
    }
};

exports.getTickerDetails = async (req, res) => {
    const coinId = String(req.query.id || 'btc-bitcoin');   // CoinPaprika coin id
    const quote  = String(req.query.quote || 'USD').toUpperCase(); // e.g. USD

    try {
        // 1) Ticker: price, % change 24h, volume 24h (in quote)
        const tickerUrl = `https://api.coinpaprika.com/v1/tickers/${encodeURIComponent(coinId)}?quotes=${quote}`;

        // 2) Today OHLCV: calendar-day high/low (NOT rolling 24h)
        const todayUrl  = `https://api.coinpaprika.com/v1/coins/${encodeURIComponent(coinId)}/ohlcv/today`;

        const [tickerRes, todayRes] = await Promise.all([ fetch(tickerUrl), fetch(todayUrl) ]);

        if (!tickerRes.ok) throw new Error(`Ticker HTTP ${tickerRes.status}`);
        if (!todayRes.ok)  throw new Error(`OHLCV today HTTP ${todayRes.status}`);

        const ticker = await tickerRes.json();
        const today  = await todayRes.json();

        const q = ticker?.quotes?.[quote] || {};
        const price = q.price ?? null;
        const percentChange24h = q.percent_change_24h ?? null;
        const volume24h = q.volume_24h ?? null;

        // compute absolute 24h change from price & percent
        let absoluteChange24h = null;
        if (price != null && percentChange24h != null) {
            const price24hAgo = price / (1 + percentChange24h / 100);
            absoluteChange24h = price - price24hAgo;
        }

        const todayCandle = Array.isArray(today) && today[0] ? today[0] : null;
        const high24h = todayCandle ? todayCandle.high : null; // calendar-day high
        const low24h  = todayCandle ? todayCandle.low  : null; // calendar-day low

        return res.json({
            success: true,
            data: {
                coinId,
                name: ticker?.name,
                symbol: `${(ticker?.symbol || '').toUpperCase()}${quote}`,
                quote,
                price,
                percentChange24h,
                absoluteChange24h,
                volume24h,
                high24h, // calendar-day
                low24h,  // calendar-day
                imageUrl: `https://static.coinpaprika.com/coin/${coinId}/logo.png`
            },
        });
    } catch (error) {
        console.error('Market ticker error:', error);
        return res.status(500).json({ success: false, message: 'Failed to load market ticker' });
    }
};
