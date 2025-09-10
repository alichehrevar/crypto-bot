const axios = require('axios');
const NodeCache = require('node-cache');
const logger = require('../../../logs/logger');

// --- Caching Setup ---
// Initialize a cache with a 2-minute (120 seconds) TTL (Time To Live)
// checkperiod will run every 121 seconds to clear out expired keys.
const cache = new NodeCache({ stdTTL: 120, checkperiod: 121 });
const MARKET_DATA_CACHE_KEY = 'coingecko_market_data'; // unique key for market data
const CRYPTO_EVENTS_CACHE_KEY = 'coingecko_crypto_events'; // unique key for events

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
    const cachedData = cache.get(MARKET_DATA_CACHE_KEY);
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
        cache.set(MARKET_DATA_CACHE_KEY, response.data);
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

/**
 * Fetches upcoming crypto events from the CoinGecko API, with a 2-minute cache.
 * @returns {Promise<Array<Object>>} A promise that resolves to a formatted array of events.
 */
exports.fetchCryptoEvents = async () => {
    // --- Step 1: Check the cache first ---
    const cachedEvents = cache.get(CRYPTO_EVENTS_CACHE_KEY);
    if (cachedEvents) {
        logger.info('Serving crypto events from cache.');
        return cachedEvents;
    }

    // --- Step 2: If cache miss, fetch from API ---
    logger.info('Cache miss. Fetching fresh crypto events from CoinGecko.');
    try {
        const response = await apiClient.get('/global/events');
        const { data } = response.data;

        if (!data) {
            return [];
        }

        // Transform the CoinGecko data to match our internal Event schema
        const formattedEvents = data.map(event => ({
            date: event.start_date, // 'YYYY-MM-DD' format
            time: 'N/A', // CoinGecko API doesn't provide a specific time
            event: event.title,
            impact: 'Low', // Assign a default impact or develop logic to determine it
            forecast: 'N/A',
            actual: 'TBD',
            source: 'CoinGecko', // Add a source to know where the data came from
        }));

        // --- Step 3: Store the fresh, formatted data in the cache ---
        cache.set(CRYPTO_EVENTS_CACHE_KEY, formattedEvents);
        logger.info('Successfully fetched and cached new crypto events.');

        return formattedEvents;

    } catch (error) {
        logger.error(`CoinGecko API Error - fetchCryptoEvents: ${error.message}`, {
            status: error.response?.status,
            data: error.response?.data,
        });
        // Return an empty array on failure so the app doesn't crash if CoinGecko is down
        return [];
    }
};

/**
 * Fetches current market data for a list of CoinGecko IDs.
 * @param {string[]} coinIds - Array of CoinGecko IDs (e.g., ['wormhole', 'ethena', 'tensor']).
 * @returns {Promise<object>} A map of coinId to its current price.
 */
exports.getMarketDataForIds = async (coinIds) => {
    if (!coinIds || coinIds.length === 0) {
        return {};
    }

    try {
        const response = await axios.get(`${COINGECKO_API_URL}/simple/price`, {
            params: {
                ids: coinIds.join(','),
                vs_currencies: 'usd',
            },
        });

        const priceMap = {};
        for (const coinId in response.data) {
            priceMap[coinId] = response.data[coinId].usd;
        }
        return priceMap;
    } catch (error) {
        logger.error('Error fetching market data from CoinGecko:', error.message);
        return {};
    }
}

// NOTE: CoinGecko's free API doesn't have a reliable "upcoming listings" endpoint.
// A real-world implementation would use a paid data provider or manual entry for this.
// For this example, we will focus on updating the prices of recent launches.
