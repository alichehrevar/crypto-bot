// app/services/coinService.js
const axios = require('axios');
const delay = require('../../utils/delay');

const COINGECKO = process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3';

// Simple in-memory cache
const cache = new Map();

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const toCoingeckoId = (id) => id.toLowerCase(); // Placeholder for your ID mapping function

// --- New Configuration for Retry Logic ---
const MAX_RETRIES = 4; // The total attempts will be MAX_RETRIES + 1
const INITIAL_DELAY_MS = 1000; // Start with a 1-second delay

/**
 * A simple helper function to wait for a specified duration.
 * @param coinIdOrSymbol
 */
async function getCoinSummary(coinIdOrSymbol) {
    const id = toCoingeckoId(coinIdOrSymbol);
    const now = Date.now();

    // 1. Check if a valid cache entry exists
    if (cache.has(id)) {
        const cached = cache.get(id);
        if (now - cached.timestamp < CACHE_TTL_MS) {
            console.log(`Returning cached data for ${id}.`);
            return cached.data;
        }
    }

    // 2. If no valid cache, fetch from API with retry logic
    let retries = MAX_RETRIES;
    let currentDelay = INITIAL_DELAY_MS;
    let coinDetailsRes = null; // Use let to allow reassignment inside the loop

    while (retries >= 0) {
        try {
            console.log(`Attempting to fetch data for ${id}...`);
            // This single endpoint provides most of what we need!
            coinDetailsRes = await axios.get(`${COINGECKO}/coins/${id}`, {
                params: {
                    localization: false,
                    tickers: false,
                    market_data: true,
                    community_data: false,
                    developer_data: false,
                    sparkline: false,
                },
            });

            // If the request was successful, break out of the retry loop
            if (coinDetailsRes.status === 200) {
                console.log(`Successfully fetched data for ${id}.`);
                break;
            }

        } catch (error) {
            // Check if the error is a 429 (Too Many Requests) and we still have retries left
            if (error.response?.status === 429 && retries > 0) {
                console.warn(`Rate limit hit for ${id}. Retrying in ${currentDelay / 1000}s... (${retries} retries left)`);
                await delay(currentDelay);
                retries--;
                currentDelay *= 2; // Exponential backoff: double the delay for the next attempt
            } else {
                // For any other error, or if we are out of retries, re-throw the error
                // to be handled by the outer catch block.
                const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
                console.error(`Error in getCoinSummary (CoinGecko) for ${coinIdOrSymbol}:`, errorMessage);

                // If API fails, check for an expired cache entry and return it if it exists
                if (cache.has(id)) {
                    console.warn(`API call failed for ${id}. Returning stale cache data.`);
                    return cache.get(id).data;
                }
                return null;
            }
        }
    }

    // If coinDetailsRes is still null after the loop, it means all retries failed.
    if (!coinDetailsRes) {
        console.error(`All retry attempts failed for ${id}.`);
        if (cache.has(id)) {
            console.warn(`Returning stale cache data for ${id} after all retries failed.`);
            return cache.get(id).data;
        }
        return null;
    }

    try {
        // --- Process and return the successful response ---
        const data = coinDetailsRes.data;
        const marketData = data.market_data;

        console.log(`Coin ${coinIdOrSymbol} (${id}) summary processed successfully.`);
        const summaryData = {
            id: data.id,
            name: data.name,
            symbol: data.symbol.toUpperCase(),
            price: marketData.current_price?.usd,
            volume_24h: marketData.total_volume?.usd,
            market_cap: marketData.market_cap?.usd,
            last_updated: marketData.last_updated,
            percent_change_24h: marketData.price_change_percentage_24h_in_currency?.usd,
            percent_change_7d: marketData.price_change_percentage_7d_in_currency?.usd,
            percent_change_30d: marketData.price_change_percentage_30d_in_currency?.usd,
            percent_change_1y: marketData.price_change_percentage_1y_in_currency?.usd,
            high_24h: marketData.high_24h?.usd,
            low_24h: marketData.low_24h?.usd,
            ath: marketData.ath?.usd,
            imageUrl: data.image?.large,
        };

        // 3. Store the new result in the cache
        cache.set(id, {
            timestamp: now,
            data: summaryData,
        });

        return summaryData;

    } catch (processingError) {
        console.error(`Failed to process data for ${id} after successful fetch:`, processingError.message);
        return null; // Or return stale cache if available
    }
}

module.exports = { getCoinSummary };
