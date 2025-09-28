// services/MarketService.js

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

/**
 * Fetches latest market data from CoinGecko and efficiently updates the database.
 * This is designed to be called by a scheduled cron job.
 */
async function fetchAndStoreMarketData() {
    const COINGECKO_API_BASE = process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3';
    const API_DELAY = 10000; // 10 seconds delay between API calls

    let allCoins = [];
    let page = 1;
    const perPage = 250;

    try {
        // 1) Fetch all coins with market data using pagination
        while (true) {
            if (page > 1) {
                await delay(API_DELAY); // Assuming you have a delay utility
            }
            const url = `${COINGECKO_API_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=false&price_change_percentage=1h%2C24h%2C7d`;
            const marketRes = await fetch(url);
            if (!marketRes.ok) throw new Error(`API call failed: ${marketRes.status}`);
            const marketData = await marketRes.json();
            if (marketData.length === 0) break;
            allCoins = allCoins.concat(marketData);
            page++;
        }
        console.log(`[Market Cron] Fetched ${allCoins.length} entries from CoinGecko.`);

        // 2) Prepare operations for a single bulk write
        if (allCoins.length === 0) {
            console.log('[Market Cron] No entries to sync.');
            return;
        }

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
                        last_updated:       coin.last_updated,
                        quotes: {
                            USD: {
                                price:                 coin.current_price,
                                market_cap:            coin.market_cap,
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
        console.log(`[Market Cron] Performing bulk write for ${bulkOps.length} operations...`);
        const result = await MarketSnapshot.bulkWrite(bulkOps, { ordered: false });
        console.log('[Market Cron] ✅ Sync complete.', {
            upserted: result.upsertedCount,
            modified: result.modifiedCount,
        });

    } catch (error) {
        console.error('[Market Cron] ❌ Error during scheduled market data update:', error);
    }
}

// Configuration constants
const MOVER_COUNT = 10;
const VOLATILITY_COUNT = 50;
const RVOL_PERIOD_DAYS = 20; // CoinGecko doesn't provide rVol, so we will simulate it conceptually.

/**
 * Calculates and retrieves market movers and volatility data using the CoinGecko API.
 * @returns {Promise<object|null>} The formatted MoversData object or null.
 */
async function getMoversAndVolatilityData () {
    try {
        // Step 1: Fetch live market data from CoinGecko
        // We fetch 250 to ensure we have a large pool to find significant movers.
        const marketData = await coinGeckoService.getMarketData(250);

        if (!marketData || marketData.length === 0) {
            logger.warn('No market data returned from CoinGecko service.');
            return null;
        }

        // Step 2: Transform CoinGecko data into the structure our frontend expects
        const enrichedAssets = marketData.map(transformCoinData).filter(asset => asset.volume > 1000000); // Filter out low-volume assets

        // Step 3: Sort by 24h change to find gainers and losers
        enrichedAssets.sort((a, b) => (b.change || 0) - (a.change || 0));

        const gainers = enrichedAssets.slice(0, MOVER_COUNT);
        const losers = enrichedAssets.slice(-MOVER_COUNT).sort((a, b) => (a.change || 0) - (b.change || 0));

        // Step 4: For the scatter plot, use the assets with the highest volume from our pool
        enrichedAssets.sort((a, b) => b.volume - a.volume);
        const volatilityScatter = enrichedAssets.slice(0, VOLATILITY_COUNT);

        return {
            gainers,
            losers,
            volatilityScatter,
        };

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
    getTopMovers,
    fetchAndStoreMarketData,
    getMoversAndVolatilityData,
};
