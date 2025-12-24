const UpcomingListing = require('../../models/UpcomingListing');

/**
 * Get all upcoming and recent listings.
 */
async function getListings(req, res) {
    try {
        const now = new Date();

        // 1. Fetch Upcoming (Limit to ~50 to prevent huge payloads)
        const upcoming = await UpcomingListing.find({
            date_event: { $gte: now }
        })
            .sort({ date_event: 'asc' })
            .limit(50)
            .lean();

        // 2. Fetch Recent (Critical: Limit this, otherwise it grows indefinitely)
        const recent = await UpcomingListing.find({
            date_event: { $lt: now }
        })
            .sort({ date_event: 'desc' })
            .limit(50) // Only show the last 50 launched tokens for performance
            .lean();

        res.status(200).json({
            data: {
                upcoming,
                recent
            },
            success: true
        });
    } catch (error) {
        console.error('Failed to fetch listings:', error);
        res.status(500).json({ message: 'Error fetching listing data.', success: false });
    }
}

module.exports = {
    getListings,
};
