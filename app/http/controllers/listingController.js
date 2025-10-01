const UpcomingListing = require('../../models/UpcomingListing');
const RecentLaunch = require('../../models/RecentLaunch');
const {updateListingsData} = require("../../services/listingService");

/**
 * Get all upcoming and recent listings.
 */
async function getListings(req, res) {
    const data = await updateListingsData();
    try {
        const upcoming = await UpcomingListing.find().sort({ date: 'asc' });
        const recent = await RecentLaunch.find().sort({ launchDate: 'desc' });

        res.status(200).json({data: { upcoming, recent }, success: true});
    } catch (error) {
        // Assuming you have a centralized logger
        console.error('Failed to fetch listings:', error);
        res.status(500).json({ error: 'Error fetching listing data.', success: false });
    }
}

module.exports = {
    getListings,
};
