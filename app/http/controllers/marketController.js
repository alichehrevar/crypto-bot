// app/http/controllers/marketController.js

const MarketService = require('../../services/marketService');
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

/**
 * Retrieves a paginated list of market data.
 * Each document represents a unique symbol-broker pair.
 *
 * @query {number} [page=1] - The page number for pagination.
 * @query {number} [limit=100] - The number of items per page.
 */
exports.getMarketList = async (req, res) => {
    try {
        const userId = req.user.id; // Assuming user is authenticated

        // 1. Pagination parameters from query string
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 100;
        // const skip = (page - 1) * limit;

        // 2. Fetch data in parallel: paginated market data and user's favorites
        const [coinsFromDB, userFavorites] = await Promise.all([
            MarketSnapshot.find({ rank: { $ne: null } })
                .sort({ rank: 1 })
                // .skip(skip)
                // .limit(limit)
                .lean(),
            FavoriteSymbol.find({ userId }).select('symbol -_id').lean()
        ]);

        const favoriteSymbolsSet = new Set(userFavorites.map(fav => fav.symbol));

        // 3. Map the database documents to the required frontend format
        const marketListData = coinsFromDB.map(coin => {
            // The broker name is now directly available in the document.
            const category = coin.category;
            const fullSymbol = `${coin.symbol.toUpperCase()}/${category === 'Spot' ? 'USDT' : 'PERP'}`;
            const isFavorite = favoriteSymbolsSet.has(fullSymbol);

            // Format the final object to match the frontend's `MarketListItem` type.
            return {
                id: coin._id.toString(), // Use the unique MongoDB document ID
                symbol: fullSymbol,
                category: category,
                broker: coin.name, // Direct from the document
                volume: coin.volume24h, // Mapped from the new field
                lastPrice: coin.price, // Mapped from the new field
                dailyChange: coin.change24h, // Mapped from the new field
                isFavorite: isFavorite,
            };
        });

        // 4. Optionally, get the total count for pagination metadata
        const totalDocuments = await MarketSnapshot.countDocuments({ rank: { $ne: null } });

        res.status(200).json({
            success: true,
            data: marketListData,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalDocuments / limit),
                totalItems: totalDocuments,
            }
        });

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
