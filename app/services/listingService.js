const axios = require('axios')
const UpcomingListing = require('../models/UpcomingListing');
const RecentLaunch = require('../models/RecentLaunch');
const sleep = require('../../utils/delay');

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
 * Fetches upcoming and recent listing events from the CoinMarketCal API.
 */
async function fetchExternalListingData() {
    console.log('Fetching data from CoinMarketCal API...');

    if (!process.env.COINMARKETCAL_API_KEY) {
        console.error("API Key for CoinMarketCal is not set. Please update the COINMARKETCAL_API_KEY constant.");
        return { upcoming: [], recent: [] };
    }

    try {
        const url = 'https://developers.coinmarketcal.com/v1/events?max=100&categories=Exchanges';
        const headers = { 'Authorization': `Bearer ${process.env.COINMARKETCAL_API_KEY}` };

        const responseData = await fetchWithRetries(url, headers);

        if (!responseData || !responseData.body) {
            console.log('No data returned from CoinMarketCal API.');
            return { upcoming: [], recent: [] };
        }

        const now = new Date();
        const upcoming = [];
        const recent = [];

        // --- Process All Events ---
        responseData.body.forEach(event => {
            if (!event.coins || event.coins.length === 0) return; // Skip events without an associated coin

            const eventDate = new Date(event.date_event);
            const coin = event.coins[0];
            const exchange = event.exchanges && event.exchanges.length > 0 ? event.exchanges[0].name : 'TBA';

            if (eventDate >= now) {
                upcoming.push({
                    date: event.date_event,
                    asset: `${coin.name} (${coin.symbol.toUpperCase()})`,
                    type: event.title,
                    exchange: exchange,
                });
            } else {
                recent.push({
                    asset: `${coin.name} (${coin.symbol.toUpperCase()})`,
                    launchDate: event.date_event,
                    launchPrice: 'N/A', // CoinMarketCal does not provide price data
                    currentPrice: 'N/A',
                    velocity: 'N/A',
                });
            }
        });

        console.log('Successfully fetched and processed data from CoinMarketCal.');

        // Sort events by date
        upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));
        recent.sort((a, b) => new Date(b.launchDate) - new Date(a.launchDate));

        return {
            upcoming: upcoming,
            recent: recent
        };

    } catch (error) {
        console.error('Failed to complete listing data update due to an error.');
        return { upcoming: [], recent: [] };
    }
}

/**
 * Fetches data from an external source and updates the database.
 * This function is designed to be idempotent.
 */
async function updateListingsData() {
    try {
        const { upcoming, recent } = await fetchExternalListingData();

        // --- Update Upcoming Listings ---
        if (upcoming && upcoming.length > 0) {
            const upcomingOps = upcoming.map(item => ({
                updateOne: {
                    filter: { asset: item.asset },
                    update: {
                        $set: {
                            asset: item.asset,
                            eventDate: new Date(item.date),
                            eventType: item.type,
                            exchange: item.exchange,
                        }
                    },
                    upsert: true
                }
            }));
            await UpcomingListing.bulkWrite(upcomingOps);
            console.log(`${upcoming.length} upcoming listings updated.`);
        }

        // --- Update Recent Launches ---
        if (recent && recent.length > 0) {
            const recentOps = recent.map(item => ({
                updateOne: {
                    filter: { asset: item.asset },
                    update: {
                        $set: {
                            ...item,
                            launchDate: new Date(item.launchDate)
                        }
                    },
                    upsert: true
                }
            }));
            await RecentLaunch.bulkWrite(recentOps);
            console.log(`${recent.length} recent launches updated.`);
        }
    } catch (error) {
        console.error('Error updating listings data:', error);
    }
}

module.exports = { updateListingsData };
