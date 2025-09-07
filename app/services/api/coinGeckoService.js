const axios = require('axios');
const NodeCache = require('node-cache');
const logger = require('../../../logs/logger');

// --- Caching Setup ---
// Initialize a cache with a 2-minute (120 seconds) TTL (Time To Live)
// checkperiod will run every 121 seconds to clear out expired keys.
const cache = new NodeCache({ stdTTL: 120, checkperiod: 121 });
const CACHE_KEY = 'coingecko_market_data';

const API_BASE_URL = process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3';
const API_TIMEOUT = 10000; // 10 seconds

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: API_TIMEOUT,
});

/**
 * Fetches the top N market cap coins from CoinGecko, with a 2-minute cache.
 * @param {number} limit The number of coins to fetch.
 * @returns {Promise<Array>} A promise that resolves to an array of coin market data.
 */
exports.getMarketData = async (limit = 250) => {
    // --- Step 1: Check the cache first ---
    const cachedData = cache.get(CACHE_KEY);
    if (cachedData) {
        logger.info('Serving market data from cache.');
        return cachedData;
    }

    // --- Step 2: If cache miss, fetch from API ---
    logger.info(`Cache miss. Fetching fresh market data for top ${limit} coins from CoinGecko.`);
    try {
        const response = await apiClient.get('/coins/markets', {
            params: {
                vs_currency: 'usd',
                order: 'market_cap_desc',
                per_page: limit,
                page: 1,
                sparkline: true,
                price_change_percentage: '24h',
            },
        });

        // --- Step 3: Store the fresh data in the cache ---
        cache.set(CACHE_KEY, response.data);
        logger.info('Successfully fetched and cached new market data.');

        return response.data;
    } catch (error) {
        logger.error(`CoinGecko API Error - getMarketData: ${error.message}`, {
            status: error.response?.status,
            data: error.response?.data,
        });
        throw new Error('Failed to fetch market data from CoinGecko.');
    }
};

