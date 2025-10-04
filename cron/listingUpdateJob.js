const cron = require('node-cron');
const {updateListingsData} = require("../app/services/listingService");
const logger = require('../logs/logger');

// This job runs every hour to update the current prices of recently launched assets.
const schedulePriceUpdate = () => {
    cron.schedule('0 * * * *', async () => {
        logger.info('Starting price update job...')
        await updateListingsData()
    });
};


// You would call this function from your main server file to start the cron job.
module.exports = { schedulePriceUpdate };
