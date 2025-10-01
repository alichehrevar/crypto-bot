// app/http/controllers/marketController.js

const axios = require('axios');

const MarketService = require('../../services/marketService');
const Currency      = require('../../models/Currency');
const MarketSnapshot = require('../../models/MarketSnapshot');
const FavoriteSymbol = require('../../models/FavoriteSymbol');
const logger = require("../../../logs/logger");

// A list of common quote currencies on Binance to strip from the symbol
const QUOTE_CURRENCIES = ['USDT', 'BUSD', 'TUSD', 'FDUSD', 'USDC', 'BTC', 'ETH'];

exports.getTopMovers = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit, 10) || 10;
        const direction = req.query.direction === 'asc' ? 'asc' : 'desc';

        // 1. Get top movers data from Binance
        const movers = await MarketService.getTopMoversFromBinance(limit, direction);

        // 2. Extract and normalize the base symbols to match your database
        const baseSymbols = movers.map(mover => {
            let base = mover.symbol;
            // Find and remove the first matching quote currency from the end
            for (const quote of QUOTE_CURRENCIES) {
                if (base.endsWith(quote)) {
                    base = base.slice(0, -quote.length);
                    break;
                }
            }
            return base.toLowerCase();
        });

        // 3. Efficiently fetch all matching documents from your database in ONE query
        const snapshotDocs = await MarketSnapshot.find({
            symbol: { $in: baseSymbols }
        }).select('symbol imageUrl').lean(); // Use .lean() for faster, plain JS objects

        // 4. Create a fast lookup map for enrichment (O(1) access)
        // Maps 'btc' -> 'https://.../bitcoin.png'
        const imageLookup = new Map(
            snapshotDocs.map(doc => [doc.symbol, doc.imageUrl])
        );

        // 5. Enrich the original Binance data with the imageUrl from your database
        const enriched = movers.map((mover, index) => {
            const correspondingBaseSymbol = baseSymbols[index];
            return {
                ...mover,
                imageUrl: imageLookup.get(correspondingBaseSymbol) || null // Fallback to null if no image found
            };
        });

        res.json({ success: true, data: enriched });
    } catch (err) {
        console.error('getTopMovers error:', err);
        logger.error(`getTopMovers error: ${err.message}`, { stack: err.stack });
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getMarketList = async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Fetch data in parallel.
        const [coinsFromDB, binanceSymbols, okxSymbols, userFavorites] = await Promise.all([
            // Fetch all fields needed for the frontend.
            MarketSnapshot.find({ type: 'coin', rank: { $ne: null } }).sort({ rank: 1 }).lean(),
            getBinanceSymbols(),
            getOkxSymbols(),
            FavoriteSymbol.find({ userId }).select('symbol').lean()
        ]);

        const favoriteSymbolsSet = new Set(userFavorites.map(fav => fav.symbol));

        // 2. Enrich and format the data.
        const marketListData = coinsFromDB.map(coin => {
            let broker = 'Other';
            let category = 'Spot';

            // Uppercase the symbol for consistent matching.
            const baseSymbol = coin.symbol.toUpperCase();

            if (binanceSymbols.has(baseSymbol)) {
                broker = 'Binance';
                category = binanceSymbols.get(baseSymbol).category;
            } else if (okxSymbols.has(baseSymbol)) {
                broker = 'OKX';
                category = okxSymbols.get(baseSymbol).category;
            }

            // Construct the full symbol for display and favorite checking.
            const fullSymbol = `${baseSymbol}/${category === 'Spot' ? 'USDT' : 'PERP'}`;
            const isFavorite = favoriteSymbolsSet.has(fullSymbol);

            // 3. Format the final object to EXACTLY match the frontend's `MarketListItem` type.
            return {
                id: coin.id,
                symbol: fullSymbol,
                category: category,
                broker: broker,
                volume: coin.quotes.USD.total_volume,
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
    // CoinGecko coin id. Note the format change from 'btc-bitcoin' to 'bitcoin'.
    const coinId = String(req.query.id || 'bitcoin');
    // CoinGecko uses lowercase for the vs_currency parameter.
    const quote  = String(req.query.quote || 'usd').toLowerCase();

    try {
        // Use the CoinGecko /coins/markets endpoint to get all data in one call.
        const apiUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${quote}&ids=${encodeURIComponent(coinId)}`;

        const apiRes = await fetch(apiUrl);

        if (!apiRes.ok) {
            throw new Error(`CoinGecko API HTTP ${apiRes.status}`);
        }

        const data = await apiRes.json();

        // The /markets endpoint returns an array, even for a single ID.
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Coin not found or empty response from CoinGecko');
        }

        const ticker = data[0];

        // --- Key Difference ---
        // CoinGecko's /markets endpoint provides a ROLLING 24h high/low,
        // not a calendar-day high/low like the previous CoinPaprika endpoint.
        const high24h = ticker.high_24h ?? null;
        const low24h  = ticker.low_24h  ?? null;

        return res.json({
            success: true,
            data: {
                coinId: ticker.id,
                name: ticker.name,
                symbol: `${(ticker.symbol || '').toUpperCase()}${(quote || '').toUpperCase()}`,
                quote: quote.toUpperCase(),
                price: ticker.current_price ?? null,
                percentChange24h: ticker.price_change_percentage_24h ?? null,
                // CoinGecko provides the absolute change directly.
                absoluteChange24h: ticker.price_change_24h ?? null,
                volume24h: ticker.total_volume ?? null,
                high24h, // Note: This is a rolling 24h high
                low24h,  // Note: This is a rolling 24h low
                imageUrl: ticker.image // CoinGecko provides a direct image URL.
            },
        });
    } catch (error) {
        console.error('Market ticker error:', error.message);
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
        const moversData = await MarketService.getMoversAndVolatilityData();

        if (!moversData) {
            return res.status(404).json({ error: 'Market data not available at the moment.', success: false });
        }

        return res.status(200).json({ data: moversData, success: true });

    } catch (error) {
        logger.error(`Error in getMoversAndVolatility controller: ${error.message}`, { stack: error.stack });
        // Forward the error to a centralized error handler
        // Respond with a generic server error if no other response has been sent
        if (!res.headersSent) {
            return res.status(503).json({ error: 'Service temporarily unavailable. Could not fetch market data.', success: false });
        }
    }
};
