// cron/index.js

/**
 * Schedules the market data update to run at the beginning of every hour.
 * Cron schedule '0 * * * *' means:
 * - 0: At minute 0
 * - *: Every hour
 * - *: Every day of the month
 * - *: Every month
 * - *: Every day of the week
 */

// Import job schedulers
const { runInitialMarketUpdate, scheduleMarketUpdate } = require('./updateMarketData');
const { scheduleSnapshots, runInitialSnapshot } = require('./snapshotJob');
const { scheduleAnomalyGeneration } = require('./anomalyGeneratorJob');
const { economicEventCron } = require('./economicEvents');
const netFlowJob = require('./netFlowJob');
const { schedulePriceUpdate } = require('./listingUpdateJob');
const { scheduleDailyAiModels, runDailyAiModels } = require('./aiModelJob');
const delay = require('../utils/delay');
const logger = require('../logs/logger');

/**
 * Initializes and starts all scheduled cron jobs for the application.
 */
const startScheduledJobs = async () => {
    try {
        const startupDelay = 10000; // 10 seconds
        logger.info('Initializing scheduled jobs with a 10-second delay between each...');

        // 1. Run the market data update
        logger.info('Starting: Market data update job.');

        // 2. Run the asset snapshot
        logger.info('Starting: Asset snapshot job.');
        await runInitialSnapshot();
        scheduleSnapshots();
        await delay(startupDelay);

        // 3. Run the anomaly generation
        logger.info('Starting: Anomaly generation job.');
        await scheduleAnomalyGeneration();
        await delay(startupDelay);

        // 4. Run the economic events
        logger.info('Starting: Economic events job.');
        await economicEventCron();
        await delay(startupDelay);

        // 5. Run Net Flow Job
        logger.info('Starting: Net flow job.');
        await netFlowJob.start();
        await delay(startupDelay);

        // 6. Run Listing Updates
        logger.info('Starting: Listing updates job.');
        schedulePriceUpdate();
        await delay(startupDelay);

        // 7. Run the initial market update
        logger.info('Starting: Initial market update job.')
        await runInitialMarketUpdate();
        scheduleMarketUpdate();

        // 8. Run Daily AI Models Schedule
        logger.info('Starting: Daily AI Model generator job.');

        // Schedule it to run every day at midnight
        scheduleDailyAiModels();

        // UNCOMMENT the line below ONLY IF you want it to also fire immediately every time you restart the server
        await runDailyAiModels();

        logger.info('✅ All scheduled jobs have been started successfully.');
    } catch (error) {
        logger.error('❌ Failed to initialize scheduled jobs:', error);
        // Optionally, exit the process if jobs are critical for the app to run
        // process.exit(1);
    }
};

module.exports = { startScheduledJobs };
