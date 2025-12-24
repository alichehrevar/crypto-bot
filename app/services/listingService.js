const axios = require('axios')
const UpcomingListing = require('../models/UpcomingListing');
const sleep = require('../../utils/delay');

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;
const COINGECKO_BASE_URL = 'https://api.coingecho.com/api/v3';

/**
 * Fetches data from a given API endpoint with headers and a retry mechanism.
 * @param {string} url - The API URL to fetch.
 * @param {object} headers - The headers for the request (e.g., for authorization).
 * @param {number} maxRetries - Maximum number of retry attempts.
 * @param {number} initialDelay - Initial delay in ms for exponential backoff.
 */
async function fetchWithRetries(url, headers, maxRetries = 3, initialDelay = 2000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await axios.get(url, { headers });
            return response.data; // Return the full response data
        } catch (error) {
            if (error.response) {
                // Handle rate limiting
                if (error.response.status === 429) {
                    if (attempt === maxRetries) {
                        console.error(`Failed to fetch from ${url} after ${maxRetries} attempts due to rate limiting.`);
                        throw error;
                    }
                    const delay = initialDelay * Math.pow(2, attempt - 1);
                    console.warn(`Rate limit hit for ${url}. Retrying in ${delay / 1000} seconds...`);
                    await sleep(delay);
                    // Handle invalid API key
                } else if (error.response.status === 401) {
                    console.error(`Authentication failed. Please check if your COINMARKETCAL_API_KEY is correct.`);
                    throw error;
                } else {
                    console.error(`An unexpected error occurred while fetching from ${url}:`, error.message);
                    throw error;
                }
            } else {
                console.error(`A network error occurred:`, error.message);
                throw error;
            }
        }
    }
    return null; // Return null if all retries fail
}

/**
 * Fetches event data, enriches it with pricing info, and transforms it.
 */
async function fetchAndTransformEvents() {
    console.log('Fetching data from CoinMarketCal API...');

    if (!process.env.COINMARKETCAL_API_KEY) {
        console.error("API Key for CoinMarketCal or CoinGecko is not set.");
        return [];
    }

    try {
        const url = 'https://developers.coinmarketcal.com/v1/events?max=10&categories=4'; // 4 is exhanges
        const headers = {
            'x-api-key': process.env.COINMARKETCAL_API_KEY,
            'Accept': 'application/json',
            'Accept-Encoding': 'deflate, gzip',
        };

        const responseData = await fetchWithRetries(url, headers);

        if (!responseData || !responseData.body || responseData.body.length === 0) {
            console.log('No new events returned from CoinMarketCal API.');
            return [];
        }

        // --- MODIFIED: Enrich and Transform Data ---
        // Use Promise.all to fetch enrichment data for all events in parallel for performance
        const enrichedEventPromises = responseData.body.map(async (event) => {
            if (!event.coins || event.coins.length === 0) return null; // Skip if no coin data

            const coin = event.coins[0];
            const coinId = coin.id;
            const launchDate = new Date(event.date_event);
            const formattedLaunchDate = `${launchDate.getDate()}-${launchDate.getMonth() + 1}-${launchDate.getFullYear()}`;

            let enrichmentData = { launchPrice: 0, currentPrice: 0, velocity: 'N/A' };

            try {
                // Fetch pricing data from CoinGecko
                const [currentPriceData, historicalPriceData] = await Promise.all([
                    axios.get(`${COINGECKO_BASE_URL}/simple/price`, {
                        params: { ids: coinId, vs_currencies: 'usd', include_24hr_change: 'true' },
                    }),
                    axios.get(`${COINGECKO_BASE_URL}/coins/${coinId}/history`, {
                        params: { date: formattedLaunchDate },
                    })
                ]);

                const currentPrice = currentPriceData.data[coinId]?.usd || 0;
                const priceChange24h = currentPriceData.data[coinId]?.usd_24h_change || 0;
                const launchPrice = historicalPriceData.data?.market_data?.current_price?.usd || 0;

                let velocity = 'Medium';
                if (priceChange24h > 5) velocity = 'High ↑';
                if (priceChange24h < -5) velocity = 'High ↓';

                enrichmentData = { launchPrice, currentPrice, velocity };

            } catch (error) {
                console.warn(`Could not fetch pricing for ${coin.name} (${coinId}). Reason: ${error.message}. Using default values.`);
            }

            // Return the complete, merged event object matching our schema
            return {
                eventId: event.id,
                title: event.title.en,
                coins: event.coins.map(c => ({
                    coinId: c.id, name: c.name, rank: c.rank, symbol: c.symbol, fullname: c.fullname
                })),
                date_event: event.date_event,
                can_occur_before: event.can_occur_before,
                created_date: event.created_date,
                displayed_date: event.displayed_date,
                categories: event.categories.map(cat => ({ categoryId: cat.id, name: cat.name })),
                proof: event.proof,
                source: event.source,
                ...enrichmentData, // Spread the new pricing data here
            };
        });

        // Wait for all enrichment promises to complete and filter out any nulls
        const transformedEvents = (await Promise.all(enrichedEventPromises)).filter(Boolean);

        console.log(`Successfully fetched and enriched ${transformedEvents.length} events.`);
        return transformedEvents;

    } catch (error) {
        console.error('Failed to fetch and transform event data:', error);
        return [];
    }
}

/**
 * Updates the database with the latest events.
 * This function is idempotent: it updates existing events or inserts new ones.
 */
async function updateListingsData() {
    try {
        const eventsToSync = await fetchAndTransformEvents();

        if (eventsToSync.length === 0) {
            console.log('No events to sync. Database is up to date.');
            return;
        }

        // --- Prepare bulk operations for efficient DB update ---
        const bulkOperations = eventsToSync.map(event => ({
            updateOne: {
                filter: { eventId: event.eventId }, // Find document by the unique eventId from the API
                update: { $set: event },             // Update the document with new data
                upsert: true,                        // If no document is found, insert it
            },
        }));

        const result = await UpcomingListing.bulkWrite(bulkOperations);
        console.log(`Database sync complete. Matched: ${result.matchedCount}, Upserted: ${result.upsertedCount}, Modified: ${result.modifiedCount}.`);

    } catch (error) {
        console.error('Error during database sync:', error);
    }
}

/**
 * CRITICAL: Updates prices for tokens that have already launched (Recent).
 * Without this, the 'Launch Performance Tracker' on the frontend will show stale data.
 */
async function updateRecentPrices() {
    console.log('Starting background price update for recent listings...');

    try {
        // Find recent listings that need price updates (e.g., launched in the last 30 days)
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentListings = await UpcomingListing.find({
            date_event: { $lt: now, $gte: thirtyDaysAgo },
            'coins.0.coinId': { $exists: true } // Ensure there is a CoinGecko ID
        }).limit(20); // Process in batches to avoid rate limits

        if (recentListings.length === 0) return;

        for (const listing of recentListings) {
            const coinId = listing.coins[0].coinId;

            try {
                // Fetch current price from CoinGecko
                const response = await axios.get(`${COINGECKO_BASE_URL}/simple/price`, {
                    params: {
                        ids: coinId,
                        vs_currencies: 'usd',
                        include_24hr_change: 'true'
                    }
                });

                const priceData = response.data[coinId];

                if (priceData) {
                    const currentPrice = priceData.usd || 0;
                    const change24h = priceData.usd_24h_change || 0;

                    // Update Velocity Logic based on live data
                    let velocity = 'Medium';
                    if (change24h > 5) velocity = 'High ↑';
                    else if (change24h < -5) velocity = 'High ↓';

                    // If launchPrice was 0 (missed previously), try to set it to current price
                    // (or fetch history if you want to be precise, but this is a fallback)
                    const updateFields = {
                        currentPrice: currentPrice,
                        velocity: velocity
                    };

                    // Only update launchPrice if it was missing
                    if (listing.launchPrice === 0 && currentPrice > 0) {
                        updateFields.launchPrice = currentPrice;
                    }

                    await UpcomingListing.updateOne(
                        { _id: listing._id },
                        { $set: updateFields }
                    );

                    console.log(`Updated price for ${listing.coins[0].name}: $${currentPrice}`);
                }

                // Small delay to respect CoinGecko Rate Limit (Free Tier)
                await sleep(1500);

            } catch (err) {
                console.error(`Failed to update price for ${coinId}:`, err.message);
            }
        }
    } catch (error) {
        console.error('Error in updateRecentPrices:', error);
    }
}

module.exports = { updateListingsData, updateRecentPrices };
