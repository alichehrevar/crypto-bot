const cron = require('node-cron');
const {updateListingsData, updateRecentPrices} = require("../app/services/listingService");
const logger = require('../logs/logger');

// This job runs every hour to update the current prices of recently launched assets.
const schedulePriceUpdate = () => {
    // Sync new events every 4 hours
    cron.schedule('0 */4 * * *', () => {
        updateListingsData().catch(err =>
            logger.error('Failed to update listings data:', err.message));
    });

    // Update prices for the "Performance Tracker" every 15 minutes
    cron.schedule('*/15 * * * *', () => {
        updateRecentPrices();
    });
};


// You would call this function from your main server file to start the cron job.
module.exports = { schedulePriceUpdate };
