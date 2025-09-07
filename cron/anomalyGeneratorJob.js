const anomalyService = require('../app/services/market/anomalyService');
const logger = require('../logs/logger');

// Schedule a task to run, for example, every 2 minutes
// Use a random interval to make it feel more natural
function scheduleAnomalyGeneration() {
    const scheduleJob = () => {
        anomalyService.detectAndStoreAnomaly();

        // Schedule the next run at a random interval between 1 and 4 minutes
        const randomInterval = Math.floor(Math.random() * 180000) + 60000; // 1-4 minutes in ms
        setTimeout(scheduleJob, randomInterval);
    };

    logger.info('Starting anomaly generation job with random intervals...');
    scheduleJob(); // Start the first job immediately
}

module.exports = { scheduleAnomalyGeneration };
