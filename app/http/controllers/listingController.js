const UpcomingListing = require('../../models/UpcomingListing');

/**
 * Get all upcoming and recent listings.
 */
async function getListings(req, res) {
    try {
        const now = new Date();

        const upcoming = await UpcomingListing.find({ date_event: { $gte: now } }).sort({ date_event: 'asc' });
        const recent = await UpcomingListing.find({ date_event: { $lt: now } }).sort({ date_event: 'desc' });

        res.status(200).json({
            data: {
                upcoming,
                recent
            },
            success: true
        });
    } catch (error) {
        // Assuming you have a centralized logger
        console.error('Failed to fetch listings:', error);
        res.status(500).json({ message: 'Error fetching listing data.', success: false });
    }
}

module.exports = {
    getListings,
};
