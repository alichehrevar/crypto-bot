/**
 * @file Service for backfilling, synchronizing, and retrieving daily snapshots of user asset balances.
 * @author Your Name
 */
const User = require('../models/User');
const AssetSnapshot = require('../models/AssetSnapshot');
const BinanceAccount = require('../models/BinanceAccount');
const OkxAccount = require('../models/OkxAccount');
const BingxAccount = require('../models/BingxAccount');
const BinanceService = require('./binanceWS');
const OkxService = require('./okxWS');
const BingxService = require('./bingXWS');

/**
 * @description The main cron job service. It ensures the last 7 days of snapshots
 * exist for each active user, backfilling any missing days.
 */
async function backfillAndSyncSnapshots() {
    console.log('[Snapshot Service] Starting backfill and sync job...');
    const users = await User.find().select('_id').lean();
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    for (const user of users) {
        try {
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(today.getDate() - 7);

            const [binanceAccts, okxAccts, bingxAccts] = await Promise.all([
                BinanceAccount.find({ userId: user._id }).lean(),
                OkxAccount.find({ userId: user._id }).lean(),
                BingxAccount.find({ userId: user._id }).lean(),
            ]);

            if (binanceAccts.length === 0 && okxAccts.length === 0 && bingxAccts.length === 0) {
                console.log(`[Snapshot Service] Skipping user ${user._id}, no accounts linked.`);
                continue;
            }

            const existingSnapshots = await AssetSnapshot.find({
                userId: user._id,
                timestamp: { $gte: sevenDaysAgo }
            }).lean();
            const existingDates = new Set(
                existingSnapshots.map(s => new Date(s.timestamp).toISOString().split('T')[0])
            );

            for (let i = 0; i < 7; i++) {
                const dateToCheck = new Date(sevenDaysAgo);
                dateToCheck.setDate(dateToCheck.getDate() + i);
                const dateString = dateToCheck.toISOString().split('T')[0];

                if (!existingDates.has(dateString) && dateToCheck < today) {
                    console.log(`[Snapshot Service] Missing snapshot for user ${user._id} on ${dateString}. Backfilling...`);

                    const [binanceHist, okxHist] = await Promise.all([
                        Promise.all(binanceAccts.map(acc => BinanceService.getHistoricalBalance(acc, dateToCheck))).then(r => r.reduce((a, b) => a + b, 0)),
                        Promise.all(okxAccts.map(acc => OkxService.getHistoricalBalance(acc, dateToCheck))).then(r => r.reduce((a, b) => a + b, 0)),
                    ]);

                    const total = binanceHist + okxHist;

                    if (total > 0) {
                        await AssetSnapshot.create({
                            userId: user._id,
                            timestamp: dateToCheck,
                            balances: { binance: binanceHist, okx: okxHist, bingx: 0 },
                            total,
                        });
                        console.log(`[Snapshot Service] Backfilled snapshot for ${user._id} on ${dateString} with total: ${total}`);
                    }
                }
            }

            const [liveBinance, liveOkx, liveBingx] = await Promise.all([
                Promise.all(binanceAccts.map(acc => BinanceService.getBalance(acc, { all: true }))).then(r => r.flat().reduce((sum, bal) => sum + parseFloat(bal.usdtBalance), 0)),
                Promise.all(okxAccts.map(acc => OkxService.getBalance(acc, { all: true }))).then(r => r.flat().reduce((sum, bal) => sum + parseFloat(bal.usdtBalance), 0)),
                Promise.all(bingxAccts.map(acc => BingxService.getBalance(acc, { all: true }))).then(r => r.flat().reduce((sum, bal) => sum + parseFloat(bal.usdtBalance), 0))
            ]);

            const liveTotal = liveBinance + liveOkx + liveBingx;

            if (liveTotal > 0) {
                await AssetSnapshot.updateOne(
                    { userId: user._id, timestamp: today },
                    { $set: { balances: { binance: liveBinance, okx: liveOkx, bingx: liveBingx }, total: liveTotal } },
                    { upsert: true }
                );
                console.log(`[Snapshot Service] Synced TODAY's snapshot for ${user._id} with total: ${liveTotal}`);
            }

        } catch (error) {
            console.error(`[Snapshot Service] Failed to process snapshots for user ${user._id}:`, error.message);
        }
    }
    console.log('[Snapshot Service] Finished backfill and sync job.');
}

/**
 * @description Retrieves the last 7 days of asset snapshots for a given user.
 * This is the function used by the assetSnapshotController.
 * @param {ObjectId} userId The ID of the user for whom to retrieve snapshots.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of snapshot documents.
 */
async function getRecentSnapshotsForUser(userId) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const snapshots = await AssetSnapshot
        .find({
            userId,
            timestamp: { $gte: sevenDaysAgo }
        })
        .sort({ timestamp: 'asc' }) // Sort ascending for a proper time-series
        .lean();

    return snapshots;
}

// Export both functions so they can be used by the cron job and the controller.
module.exports = {
    backfillAndSyncSnapshots,
    getRecentSnapshotsForUser
};
