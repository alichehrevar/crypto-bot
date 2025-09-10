const UpcomingListing = require('../models/UpcomingListing');
const RecentLaunch = require('../models/RecentLaunch');
// In a real scenario, you'd use a service like coinGeckoService or a dedicated API client.
// const coinGeckoService = require('./api/coinGeckoService');

/**
 * Mocks fetching data from an external API (e.g., CryptoRank, CoinGecko).
 * Replace this with your actual data source.
 */
async function fetchExternalListingData() {
    console.log('Simulating fetch from external API for new listings...');
    // This function should return data in a structured format.
    // In a real-world app, this would involve HTTP requests to a third-party API.
    return {
        upcoming: [
            { date: '2025-09-15 12:00 UTC', asset: 'ZetaChain (ZETA)', type: 'Listing', exchange: 'OKX' },
            { date: '2025-09-22 14:00 UTC', asset: 'Monad (MONAD)', type: 'Token Generation Event (TGE)', exchange: 'Multiple' },
        ],
        recent: [
            { asset: 'Wormhole (W)', launchDate: '2025-07-10', launchPrice: 1.25, currentPrice: 0.98, velocity: 'Medium' },
            { asset: 'Ethena (ENA)', launchDate: '2025-07-15', launchPrice: 0.60, currentPrice: 1.85, velocity: 'Very High' },
            { asset: 'Tensor (TNSR)', launchDate: '2025-08-01', launchPrice: 1.50, currentPrice: 1.62, velocity: 'High' },
        ]
    };
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

/**
 * Retrieves all listings from the database for the frontend.
 */
async function getListings() {
    // Fetch upcoming listings, sorted by date
    const upcoming = await UpcomingListing.find({}).sort({ eventDate: 'asc' });

    // Fetch recent launches, sorted by launch date descending
    const recent = await RecentLaunch.find({}).sort({ launchDate: 'desc' });

    return { upcoming, recent };
}

module.exports = {
    updateListingsData,
    getListings,
};
