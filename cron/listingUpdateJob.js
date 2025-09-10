const cron = require('node-cron');
const listingService = require('../app/services/listingService');
const logger = require('../logs/logger');

/**
 * Schedules a cron job to run every hour to update listings data.
 */
function scheduleListingUpdates() {
    // Runs at the beginning of every hour
    cron.schedule('0 * * * *', async () => {
        logger.info('Running scheduled job: updateListingsData...');
        try {
            await listingService.updateListingsData();
            logger.info('Finished scheduled job: updateListingsData successfully.');
        } catch (error) {
            logger.error('Error during scheduled listing update:', error);
        }
    });

    console.log('📰 New listings update job scheduled to run every hour.');
}

module.exports = { scheduleListingUpdates };
