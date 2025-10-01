// services/MarketService.js

const NodeCache = require('node-cache');
const axios = require('axios')
const MarketSnapshot = require('../models/MarketSnapshot');
const coinGeckoService = require('./api/coinGeckoService');
const delay = require('../../utils/delay');
const logger = require('../../logs/logger');

/**
 * Get top movers from the DB.
 *
 * @param {number} limit     how many movers to return (1–100)
 * @param {'asc'|'desc'} direction  'desc' → biggest gainers, 'asc' → biggest losers
 */
async function getTopMovers(limit = 5, direction = 'desc') {
    const lim = Math.max(1, Math.min(100, limit));
    const dir = direction === 'asc' ? 'asc' : 'desc';

    const match = {
        type: 'coin',                                   // ← only real coins
        'quotes.USD.percent_change_24h': dir === 'desc'
            ? { $gt: 0 }
            : { $lt: 0 }
    };

    const sortOrder = {
        'quotes.USD.percent_change_24h': dir === 'desc' ? -1 : 1
    };

    const docs = await MarketSnapshot
        .find(match)
        .sort(sortOrder)
        .limit(lim)
        .select('symbol name imageUrl quotes.USD.percent_change_24h');

    return docs.map(d => ({
        symbol:    d.symbol,
        name:      d.name,
        imageUrl:  d.imageUrl,
        changePct: d.quotes.USD.percent_change_24h
    }));
}

const getTopMoversFromBinance = async (limit = 5, direction = 'desc') => {
    try {
        // 1. Fetch 24hr ticker data for ALL symbols from Binance
        const response = await axios.get('https://api.binance.com/api/v3/ticker/24hr');
        const tickers = response.data;

        // 2. Filter, parse, and sort the data
        const movers = tickers
            // We only want pairs trading against a stablecoin like USDT for a fair comparison
            .filter(ticker => ticker.symbol.endsWith('USDT'))
            // Convert the price change percent from a string to a number
            .map(ticker => ({
                symbol: ticker.symbol,
                priceChangePercent: parseFloat(ticker.priceChangePercent),
                lastPrice: parseFloat(ticker.lastPrice),
                volume: parseFloat(ticker.volume),
            }))
            // Sort by priceChangePercent
            .sort((a, b) => {
                if (direction === 'asc') {
                    return a.priceChangePercent - b.priceChangePercent; // Gainers
                }
                return b.priceChangePercent - a.priceChangePercent; // Losers
            });

        // 3. Return the top N results based on the limit
        return movers.slice(0, limit);

    } catch (error) {
        console.error('Error fetching top movers from Binance:', error.message);
        // Re-throw the error to be caught by the controller
        throw new Error('Failed to fetch market data from Binance.');
    }
};

/**
 * A resilient fetch wrapper that handles 429 rate-limiting errors automatically.
 */
async function fetchWithRetries(url, maxRetries = 5) {
    for (let i = 0; i < maxRetries; i++) {
        const response = await fetch(url);
        if (response.ok) {
            return response; // Success!
        }
        if (response.status === 429) {
            // CoinGecko's rate limit message is in the JSON body
            const errorBody = await response.json();
            const retryAfter = errorBody.status?.error_message?.match(/Wait (\d+) seconds/)?.[1] || '30';
            const waitMs = parseInt(retryAfter, 10) * 1000 + 1000; // Add 1s buffer

            logger.warn(`[Market Cron] Rate limit hit. Waiting for ${waitMs / 1000} seconds...`);
            await delay(waitMs);
            continue; // Retry the request
        }
        throw new Error(`API call failed with status: ${response.status}`);
    }
    throw new Error(`API call failed after ${maxRetries} retries.`);
}


// --- Main Cron Job Logic ---

async function fetchAndStoreMarketData() {
    const COINGECKO_API_BASE = process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3';
    const API_DELAY = 2000; // A short, 2-second polite delay between successful calls
    const perPage = 250;

    let allCoins = [];
    let page = 1;

    try {
        // 1) Fetch all coins using the resilient fetcher
        while (true) {
            if (page > 1) {
                await delay(API_DELAY);
            }
            const url = `${COINGECKO_API_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=false&price_change_percentage=1h%2C24h%2C7d`;

            logger.info(`[Market Cron] Fetching page ${page}...`);
            const marketRes = await fetchWithRetries(url); // Using the resilient fetcher

            const marketData = await marketRes.json();
            if (marketData.length === 0) break;
            allCoins = allCoins.concat(marketData);
            page++;
        }
        logger.info(`[Market Cron] Fetched a total of ${allCoins.length} entries from CoinGecko.`);

        if (allCoins.length === 0) {
            logger.info('[Market Cron] No entries to sync.');
            return;
        }

        // 2) Prepare bulk operations with COMPLETE data mapping
        const bulkOps = allCoins.map(coin => ({
            updateOne: {
                filter: { id: coin.id },
                update: {
                    $set: {
                        name:               coin.name,
                        symbol:             coin.symbol,
                        rank:               coin.market_cap_rank,
                        type:               coin.asset_platform_id ? 'token' : 'coin',
                        circulating_supply: coin.circulating_supply,
                        total_supply:       coin.total_supply,
                        max_supply:         coin.max_supply,
                        ath:                coin.ath,
                        ath_change_percentage: coin.ath_change_percentage,
                        ath_date:           coin.ath_date,
                        atl:                coin.atl,
                        atl_change_percentage: coin.atl_change_percentage,
                        first_data_at:      coin.atl_date,
                        last_updated:       coin.last_updated,
                        roi:                coin.roi,
                        quotes: {
                            USD: {
                                price:                 coin.current_price,
                                high_24h:              coin.high_24h,
                                low_24h:               coin.low_24h,
                                price_change_24h:      coin.price_change_24h,
                                market_cap:            coin.market_cap,
                                market_cap_change_24h: coin.market_cap_change_24h,
                                market_cap_change_percentage_24h: coin.market_cap_change_percentage_24h,
                                fully_diluted_valuation: coin.fully_diluted_valuation,
                                total_volume:          coin.total_volume,
                                percent_change_1h:     coin.price_change_percentage_1h_in_currency,
                                percent_change_24h:    coin.price_change_percentage_24h_in_currency,
                                percent_change_7d:     coin.price_change_percentage_7d_in_currency,
                            }
                        },
                        imageUrl:           coin.image
                    }
                },
                upsert: true
            }
        }));

        // 3) Execute the bulk operation
        logger.info(`[Market Cron] Performing bulk write for ${bulkOps.length} operations...`);
        const result = await MarketSnapshot.bulkWrite(bulkOps, { ordered: false });
        logger.info('[Market Cron] ✅ Sync complete.', {
            upserted: result.upsertedCount,
            modified: result.modifiedCount,
        });

    } catch (error) {
        logger.error('[Market Cron] ❌ Error during scheduled market data update:', error);
    }
}

// Configuration constants
const MOVER_COUNT = 20;
const VOLATILITY_COUNT = 50;
const RVOL_PERIOD_DAYS = 20; // CoinGecko doesn't provide rVol, so we will simulate it conceptually.

// Create a cache instance. Data will be stored for 5 minutes (300 seconds).
// You can adjust stdTTL (standard Time-To-Live) to your needs.
const marketDataCache = new NodeCache({ stdTTL: 300 });

// Define a key for our cached data
const CACHE_KEY = 'moversAndVolatility';


/**
 * Calculates and retrieves market movers and volatility data using the CoinGecko API.
 * @returns {Promise<object|null>} The formatted MoversData object or null.
 */
async function getMoversAndVolatilityData () {
    // Step 1: Check if valid data is already in the cache
    const cachedData = marketDataCache.get(CACHE_KEY);
    if (cachedData) {
        logger.info('Returning movers and volatility data from cache.');
        return cachedData;
    }

    // If not in cache, proceed with fetching and processing
    logger.info('Cache miss. Fetching fresh movers and volatility data from CoinGecko.');
    try {
        // Step 2: Fetch live market data from CoinGecko
        // We fetch 250 to ensure we have a large pool to find significant movers.
        const marketData = await coinGeckoService.getMarketData(250);

        if (!marketData || marketData.length === 0) {
            logger.warn('No market data returned from CoinGecko service.');
            return null;
        }

        console.log(marketData)

        // Step 3: Transform CoinGecko data into the structure our frontend expects
        const enrichedAssets = marketData.map(transformCoinData).filter(asset => asset.volume > 1000000); // Filter out low-volume assets

        // Step 4: Sort by 24h change to find gainers and losers
        enrichedAssets.sort((a, b) => (b.change || 0) - (a.change || 0));

        const gainers = enrichedAssets.slice(0, MOVER_COUNT);
        const losers = enrichedAssets.slice(-MOVER_COUNT).sort((a, b) => (a.change || 0) - (b.change || 0));

        // Step 5: For the scatter plot, use the assets with the highest volume from our pool
        enrichedAssets.sort((a, b) => b.volume - a.volume);
        const volatilityScatter = enrichedAssets.slice(0, VOLATILITY_COUNT);

        const result = {
            gainers,
            losers,
            volatilityScatter,
        };

        // Step 4: Store the fresh result in the cache before returning
        marketDataCache.set(CACHE_KEY, result);

        return result;

    } catch (error) {
        // The error is already logged in coinGeckoService, but we log it here too for context
        logger.error(`Failed to get movers and volatility data in marketService: ${error.message}`);
        // Re-throw to be caught by the controller
        throw error;
    }
}

/**
 * Transforms a single coin object from CoinGecko API into our MoverItem structure.
 * @param {object} coin - A coin data object from CoinGecko.
 * @returns {object} The formatted MoverItem.
 */
const transformCoinData = (coin) => {
    // CoinGecko API doesn't provide Relative Volume (rVol).
    // A true rVol requires historical daily volume data, which is another expensive API call per coin.
    // For this component, we can derive a "volatility score" as a stand-in for rVol
    // by comparing the 24h volume to its own market cap. A high ratio suggests unusual activity.
    const volumeToMarketCapRatio = coin.total_volume && coin.market_cap ? (coin.total_volume / coin.market_cap) * 10 : 1;
    const simulatedRvol = Math.max(0.5, Math.min(5, volumeToMarketCapRatio)); // Clamp the value for better visualization

    return {
        asset: coin.symbol.toUpperCase(),
        change: coin.price_change_percentage_24h || 0,
        volume: coin.total_volume || 0,
        rVol: simulatedRvol, // Using our simulated rVol
        sparkline: coin.sparkline_in_7d?.price || [], // Use the 7-day sparkline provided
    };
};

module.exports = {
    getTopMoversFromBinance,
    fetchAndStoreMarketData,
    getMoversAndVolatilityData,
};
