// app/http/controllers/marketController.js

const axios = require('axios');

const MarketService = require('../../services/marketService');
const Currency      = require('../../models/Currency');
const MarketSnapshot = require('../../models/MarketSnapshot');
const FavoriteSymbol = require('../../models/FavoriteSymbol');
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
        // Get the authenticated user's ID from the request object.
        const userId = req.user.id;

        // 1. Fetch base data, exchange symbols, and the user's personal favorites in parallel.
        const [coinsFromDB, binanceSymbols, okxSymbols, userFavorites] = await Promise.all([
            MarketSnapshot.find({ type: 'coin' }).sort({ rank: 1 }).lean(),
            getBinanceSymbols(),
            getOkxSymbols(),
            // Fetch all favorite symbols for this specific user.
            FavoriteSymbol.find({ userId }).select('symbol').lean()
        ]);

        // Create a Set of the user's favorite symbols for fast lookups.
        const favoriteSymbolsSet = new Set(userFavorites.map(fav => fav.symbol));

        // 2. Enrich the database data with live exchange info and the correct favorite status.
        const marketListData = coinsFromDB.map((coin, index) => {
            let broker = 'Other';
            let category = 'Spot';

            if (binanceSymbols.has(coin.symbol)) {
                broker = 'Binance';
                category = binanceSymbols.get(coin.symbol).category;
            } else if (okxSymbols.has(coin.symbol)) {
                broker = 'OKX';
                category = okxSymbols.get(coin.symbol).category;
            }

            const fullSymbol = `${coin.symbol}/${category === 'Spot' ? 'USDT' : 'PERP'}`;

            // Check if the full symbol exists in the user's favorite set.
            const isFavorite = favoriteSymbolsSet.has(fullSymbol);

            // 3. Format the final object to match the frontend's `SymbolData` interface.
            return {
                id: coin.id,
                symbol: fullSymbol,
                category: category,
                broker: broker,
                volume: coin.quotes.USD.volume_24h,
                lastPrice: coin.quotes.USD.price,
                dailyChange: coin.quotes.USD.percent_change_24h,
                isFavorite: isFavorite,
            };
        });

        res.status(200).json({ data: marketListData, success: true });

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

/**
 * Fetches all tradable symbols from the Binance API.
 * @returns {Promise<Map<string, { category: 'Spot' | 'USDT-M' }>>} A Map where keys are symbols (e.g., 'BTC')
 * and values contain their category.
 */
async function getBinanceSymbols() {
    try {
        const [spotRes, futuresRes] = await Promise.all([
            axios.get('https://api.binance.com/api/v3/exchangeInfo'),
            axios.get('https://fapi.binance.com/fapi/v1/exchangeInfo')
        ]);

        const symbolMap = new Map();

        // Process Spot symbols
        if (spotRes.data && spotRes.data.symbols) {
            for (const s of spotRes.data.symbols) {
                if (s.quoteAsset === 'USDT') {
                    symbolMap.set(s.baseAsset, { category: 'Spot' });
                }
            }
        }

        // Process USDT-M futures symbols
        if (futuresRes.data && futuresRes.data.symbols) {
            for (const s of futuresRes.data.symbols) {
                if (s.quoteAsset === 'USDT' && s.contractType === 'PERPETUAL') {
                    // Spot data takes precedence if it exists
                    if (!symbolMap.has(s.baseAsset)) {
                        symbolMap.set(s.baseAsset, { category: 'USDT-M' });
                    }
                }
            }
        }
        return symbolMap;
    } catch (error) {
        console.error('Failed to fetch Binance symbols:', error.message);
        return new Map(); // Return empty map on error
    }
}

/**
 * Fetches all tradable symbols from the OKX API.
 * @returns {Promise<Map<string, { category: 'Spot' | 'USDT-M' }>>} A Map of OKX symbols.
 */
async function getOkxSymbols() {
    try {
        const response = await axios.get('https://www.okx.com/api/v5/public/instruments?instType=SWAP');
        const symbolMap = new Map();

        if (response.data && response.data.data) {
            for (const inst of response.data.data) {
                if (inst.settleCcy === 'USDT') {
                    symbolMap.set(inst.baseCcy, { category: 'USDT-M' });
                }
            }
        }
        return symbolMap;
    } catch (error) {
        console.error('Failed to fetch OKX symbols:', error.message);
        return new Map();
    }
}

/**
 * Controller to handle requests for the Market Movers & Volatility data.
 */
exports.getMoversAndVolatility = async (req, res) => {
    try {
        const moversData = await MarketService.getMoversAndVolatility();
        res.status(200).json({ success: true, data: moversData });
    } catch (error) {
        console.error('Movers and Volatility controller error:', error);
        res.status(500).json({ success: false, message: 'Failed to load market movers data' });
    }
};
