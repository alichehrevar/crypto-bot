// cron/aiModelJob.js
const cron = require('node-cron');
const n8nService = require('../app/services/n8nService');
const User = require('../app/models/User');
const delay = require('../utils/delay');
const logger = require('../logs/logger');

const AI_MODELS = ['Chat-GPT', 'Gemini', 'Claude', 'Grok', 'DeepSeek'];

/**
 * The core function that triggers the AI workflows
 */
async function runDailyAiModels() {
    logger.info('🤖 Starting daily AI model generation job...');

    try {
        // Find an admin user to own these system-generated jobs.
        // Adjust the query if your admin identifier is different (e.g., isAdmin: true)
        const adminUser = await User.findOne({ role: 'admin' }) || await User.findOne();
        const systemUserId = adminUser ? adminUser._id.toString() : "000000000000000000000000";

        for (const model of AI_MODELS) {
            const payload = {
                model: model,
                symbol: "BTCUSDT",
                timeframe: "1m",
                max_signal: 3
            };

            try {
                logger.info(`📤 Triggering N8N 'ai-model' workflow for: ${model}`);
                await n8nService.initiateAsyncWorkflow(systemUserId, payload, 'ai-model');
                logger.info(`✅ Successfully dispatched job for ${model}`);
            } catch (err) {
                logger.error(`❌ Failed to dispatch job for ${model}: ${err.message}`);
            }

            // Wait 15 seconds before sending the next one to avoid N8N / AI API rate limits
            await delay(15000);
        }

        logger.info('🏁 Daily AI model generation job completed.');

    } catch (error) {
        logger.error(`❌ Critical error in daily AI model job: ${error.message}`);
    }
}

/**
 * Schedules the job to run every day at midnight (00:00) server time.
 */
const scheduleDailyAiModels = () => {
    // '0 0 * * *' = Runs at 00:00 every day
    cron.schedule('0 0 * * *', runDailyAiModels, {
        scheduled: true,
        timezone: "UTC" // Adjust if you want it to run at midnight in a specific timezone
    });
};

module.exports = {
    scheduleDailyAiModels,
    runDailyAiModels
};
