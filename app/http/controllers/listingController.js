const listingService = require('../../services/listingService');

async function getListings(req, res) {
    try {
        const data = await listingService.getListings();

        // Format data to match frontend expectations
        const formattedData = {
            upcoming: data.upcoming.map(item => ({
                date: item.eventDate.toUTCString(),
                asset: item.asset,
                type: item.eventType,
                exchange: item.exchange,
            })),
            recent: data.recent.map(item => ({
                asset: item.asset,
                // Formatting date to YYYY-MM-DD
                launchDate: item.launchDate.toISOString().split('T')[0],
                launchPrice: item.launchPrice,
                currentPrice: item.currentPrice,
                velocity: item.velocity,
            })),
        };

        res.status(200).json(formattedData);
    } catch (error) {
        console.error('Failed to get listings:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

module.exports = {
    getListings,
};
