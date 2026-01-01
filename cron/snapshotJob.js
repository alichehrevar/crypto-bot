/**
 * @file Defines and schedules the cron job for taking daily asset snapshots.
 * It also provides a function to run the job immediately on application startup.
 */
const cron = require('node-cron');
const { backfillAndSyncSnapshots } = require('../app/services/AssetSnapshotService');

/**
 * @description Schedules the `takeSnapshotAllUsers` service to run on a recurring basis.
 * The default schedule is hourly, but can be adjusted (e.g., '0 0 * * *' for daily at midnight).
 */
const scheduleSnapshots = () => {
    // This schedule runs at the beginning of every hour.
    cron.schedule('* * * * *', () => {
        console.log('[Snapshot Cron] ⏳ Running minute snapshot job…');
        backfillAndSyncSnapshots().catch(err => {
            console.error('[Snapshot Cron] ❌ Minute snapshot job failed:', err);
        });
    }, {
        scheduled: true,
        timezone: "Etc/UTC" // Using a consistent timezone is recommended for servers.
    });

    console.log('[Snapshot Cron] ⏰ Minute asset snapshot job scheduled.');
};

/**
 * @description Runs the snapshot job one time immediately.
 * Intended for use on application startup to ensure data is fresh.
 */
const runInitialSnapshot = async () => {
    try {
        console.log('[Snapshot Startup] ⏳ Fetching initial asset snapshot on startup…');
        await backfillAndSyncSnapshots();
        console.log('[Snapshot Startup] ✅ Initial asset snapshot completed successfully.');
    } catch (err) {
        console.error('[Snapshot Startup] ❌ Failed to run initial asset snapshot:', err.message);
    }
};

module.exports = {
    runInitialSnapshot,
    scheduleSnapshots
};
