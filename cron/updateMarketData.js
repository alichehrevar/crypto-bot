const cron = require('node-cron');
const { fetchAndStoreMarketData } = require('../app/services/marketService');

const scheduleMarketUpdate = () => {
    // Run every hour
    cron.schedule('0 0 * * *', async () => {
        try {
            console.log('[Cron] Updating market data (scheduled)…');
            await fetchAndStoreMarketData();
        } catch (err) {
            console.error('[Cron] ❌ Scheduled update failed:', err.message);
        }
    });

    console.log('[Cron] ⏰ Market data cron job scheduled.');
};

// run on project startup
const runInitialMarketUpdate = async () => {
    try {
        console.log('[Startup] ⏳ Fetching market data (startup)…');
        await fetchAndStoreMarketData();
        console.log('[Startup] ✅ Market data fetched on startup.');
    } catch (err) {
        console.error('[Startup] ❌ Failed to fetch market data on startup:', err.message);
    }
};

module.exports = {
    runInitialMarketUpdate,
    scheduleMarketUpdate
};
