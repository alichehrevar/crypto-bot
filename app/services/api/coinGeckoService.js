const axios = require('axios');
const NodeCache = require('node-cache');
const logger = require('../../../logs/logger');
const delay = require("../../../utils/delay");

// --- Caching Setup ---
// Initialize a cache with a 2-minute (120 seconds) TTL (Time To Live)
// checkperiod will run every 121 seconds to clear out expired keys.
const cache = new NodeCache({ stdTTL: 120, checkperiod: 121 });
const MARKET_DATA_CACHE_KEY = 'coingecko_market_data'; // unique key for market data
const CRYPTO_EVENTS_CACHE_KEY = 'coingecko_crypto_events'; // unique key for events

const API_BASE_URL = process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3';
const API_TIMEOUT = 10000; // 10 seconds

const MAX_RETRIES = 3; // Maximum number of retries
const INITIAL_DELAY_MS = 2000; // Initial delay of 2 seconds

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
    const maxRetries = 5;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await axios.get(`${API_BASE_URL}/coins/markets`, {
                params: {
                    vs_currency: 'usd',
                    order: 'market_cap_desc',
                    per_page: limit,
                    page: 1,
                    sparkline: true,
                    price_change_percentage: '24h',
                },
            });

            // --- SUCCESS: If we reach here, the status is 2xx ---
            cache.set(MARKET_DATA_CACHE_KEY, response.data);
            logger.info('Successfully fetched and cached new market data.');
            return response.data; // Exit function on success

        } catch (error) {
            // --- FAILURE: Check if the error is a 429 and retry ---
            if (error.response?.status === 429 && attempt < maxRetries) {
                // Use the error data from the axios error object
                const errorBody = error.response.data;
                // Your logic to parse the wait time from CoinGecko's response body
                const retryAfter = errorBody.status?.error_message?.match(/Wait (\d+) seconds/)?.[1] || '30';
                const waitMs = parseInt(retryAfter, 10) * 1000 + 1000; // Add 1s buffer

                logger.warn(
                    `Rate limit hit. Retrying in ${waitMs / 1000}s... (Attempt ${attempt}/${maxRetries})`
                );
                await delay(waitMs); // Wait before the next iteration
                continue; // Go to the next attempt
            }

            // --- FINAL FAILURE: For non-429 errors or after all retries failed ---
            logger.error(`CoinGecko API Error - getMarketData: ${error.message}`, {
                status: error.response?.status,
                data: error.response?.data,
            });
            throw new Error('Failed to fetch market data from CoinGecko.');
        }
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
const CMC_EVENTS_CACHE_KEY = 'cmc_crypto_events'; // New cache key

/**
 * Fetches crypto events from the CoinMarketCal API.
 * @returns {Promise<Array<Object>>} A promise that resolves to a formatted array of events.
 */
exports.fetchCryptoEventsFromCMC = async () => {
    // --- Step 1: Check the cache first ---
    const cachedEvents = cache.get(CMC_EVENTS_CACHE_KEY);
    if (cachedEvents) {
        logger.info('Serving crypto events from CoinMarketCal cache.');
        return cachedEvents;
    }

    // --- Step 2: If cache miss, fetch from API ---
    logger.info('Cache miss. Fetching fresh crypto events from CoinMarketCal.');
    try {
        const apiKey = process.env.COINMARKETCAL_API_KEY;
        if (!apiKey) {
            throw new Error('CoinMarketCal API key is not configured.');
        }

        const response = await axios.get('https://developers.coinmarketcal.com/v1/events', {
            params: {
                max: 100,
            },
            headers: {
                'x-api-key': apiKey,
                'Accept': 'application/json',
                'Accept-Encoding': 'deflate, gzip',
            },
            timeout: API_TIMEOUT,
        });

        // CORRECTED: Access the 'body' property for the events array
        const events = response.data.body || [];

        // Transform the CoinMarketCal data to match our internal Event schema
        const formattedEvents = events.map(event => {
            // CORRECTED: Logic to infer impact from votes, as 'hot_event' is unavailable.
            // These thresholds are examples and can be adjusted.
            let impact = 'Low';
            if (event.votes > 500) {
                impact = 'High';
            } else if (event.votes > 200) {
                impact = 'Medium';
            }

            return {
                date: event.date_event.split('T')[0],
                time: new Date(event.date_event).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC',
                event: `[${event.coins.map(c => c.symbol).join(', ')}] ${event.title.en}`,
                impact: impact,
                forecast: 'N/A',
                actual: 'TBD',
                source: 'CoinMarketCal',
                source_link: event.source,
            };
        });

        // --- Step 3: Store the fresh, formatted data in the cache ---
        cache.set(CMC_EVENTS_CACHE_KEY, formattedEvents);
        logger.info('Successfully fetched and cached new crypto events from CoinMarketCal.');

        return formattedEvents;

    } catch (error) {
        const status = error.response?.status;
        const data = error.response?.data;
        logger.error(`CoinMarketCal API Error: ${error.message}`, { status, data });

        return [];
    }
};
