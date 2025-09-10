const cron = require('node-cron');
const RecentLaunch = require('../app/models/RecentLaunch');
const { getMarketDataForIds } = require('../app/services/api/coinGeckoService');
const logger = require('../logs/logger');

// This job runs every hour to update the current prices of recently launched assets.
const schedulePriceUpdate = () => {
    cron.schedule('0 * * * *', async () => {
        logger.info('Running cron job: UpdateRecentLaunchPrices');
        try {
            const recentLaunches = await RecentLaunch.find({}).select('coingeckoId').lean();
            if (recentLaunches.length === 0) {
                logger.info('No recent launches to update.');
                return;
            }

            const coinIds = recentLaunches.map(launch => launch.coingeckoId);
            const priceMap = await getMarketDataForIds(coinIds);

            if (Object.keys(priceMap).length === 0) {
                logger.warn('Price map from CoinGecko is empty. Skipping updates.');
                return;
            }

            const bulkOps = [];
            for (const coinId in priceMap) {
                bulkOps.push({
                    updateOne: {
                        filter: { coingeckoId: coinId },
                        update: { $set: { currentPrice: priceMap[coinId] } },
                    },
                });
            }

            if (bulkOps.length > 0) {
                const result = await RecentLaunch.bulkWrite(bulkOps);
                logger.info(`Successfully updated prices for ${result.modifiedCount} assets.`);
            }

        } catch (error) {
            logger.error('Error during UpdateRecentLaunchPrices cron job:', error);
        }
    });
};


// You would call this function from your main server file to start the cron job.
module.exports = { schedulePriceUpdate };
