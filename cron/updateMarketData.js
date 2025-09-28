const cron = require('node-cron');
const { fetchAndStoreMarketData } = require('../app/services/marketService');

const scheduleMarketUpdate = () => {
    // Run every 24 hours
    cron.schedule('0 * * * *', async () => {
        try {
            console.log('[Cron] Updating market data (scheduled)…');
            await fetchAndStoreMarketData();
        } catch (err) {
            console.error('[Cron] ❌ Scheduled update failed:', err.message);
        }
    });

    console.log('[Cron] ⏰ Market data cron job scheduled.');
};

module.exports = {
    scheduleMarketUpdate
};
