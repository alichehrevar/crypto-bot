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

const { collectAllDetailsForUser, buildTreesFromDetails, toFixed2 } = require('./AssetAggregationService');

async function backfillAndSyncSnapshots() {
    console.log('[Snapshot Service] Starting backfill and sync job...');
    const users = await User.find().select('_id').lean();
    const today = new Date(); today.setUTCHours(0,0,0,0);

    for (const user of users) {
        try {
            const sevenDaysAgo = new Date(today); sevenDaysAgo.setDate(today.getDate() - 7);

            const [binanceAccts, okxAccts, bingxAccts] = await Promise.all([
                BinanceAccount.find({ userId: user._id }).lean(),
                OkxAccount.find({ userId: user._id }).lean(),
                BingxAccount.find({ userId: user._id }).lean(),
            ]);

            if (!binanceAccts.length && !okxAccts.length && !bingxAccts.length) {
                console.log(`[Snapshot Service] Skipping user ${user._id}, no accounts linked.`);
                continue;
            }

            // -------- Historical backfill (totals-only) ----------
            const snapshots = await AssetSnapshot.find({
                userId: user._id,
                timestamp: { $gte: sevenDaysAgo }
            }).lean();
            const existingDates = new Set(snapshots.map(s => new Date(s.timestamp).toISOString().split('T')[0]));

            for (let i = 0; i < 7; i++) {
                const dateToCheck = new Date(sevenDaysAgo);
                dateToCheck.setDate(dateToCheck.getDate() + i);
                const dateString = dateToCheck.toISOString().split('T')[0];

                if (!existingDates.has(dateString) && dateToCheck < today) {
                    console.log(`[Snapshot Service] Missing snapshot for user ${user._id} on ${dateString}. Backfilling...`);

                    const [binanceHist, okxHist, bingxHist] = await Promise.all([
                        Promise.all(binanceAccts.map(acc => BinanceService.getHistoricalBalance(acc, dateToCheck))).then(r => r.reduce((a,b)=>a + (Number(b)||0),0)),
                        Promise.all(okxAccts.map(acc => OkxService.getHistoricalBalance(acc, dateToCheck))).then(r => r.reduce((a,b)=>a + (Number(b)||0),0)),
                        Promise.all(bingxAccts.map(acc => BingxService.getHistoricalBalance(acc, dateToCheck))).then(r => r.reduce((a,b)=>a + (Number(b)||0),0)),
                    ]);

                    const total = toFixed2(binanceHist + okxHist + bingxHist);
                    if (total > 0) {
                        await AssetSnapshot.create({
                            userId: user._id,
                            timestamp: dateToCheck,
                            balances: { binance: binanceHist, okx: okxHist, bingx: bingxHist },
                            total,
                            brokerTree: null, assetTree: null,
                            details: [],
                            meta: { builtFrom: ['binance','okx','bingx'], notes: 'Backfilled totals only' }
                        });
                        console.log(`[Snapshot Service] Backfilled ${user._id} on ${dateString} total: ${total}`);
                    }
                }
            }

            // -------- Today: FULL details + trees ----------
            // NEW: collect normalized details using updated WS services
            const { details, totals, total, priceInfo } = await collectAllDetailsForUser(user._id, {
                BinanceAccount, OkxAccount, BingxAccount
            });

            if (total > 0) {
                const { brokerTree, assetTree } = buildTreesFromDetails(details);

                await AssetSnapshot.updateOne(
                    { userId: user._id, timestamp: today },
                    {
                        $set: {
                            balances: { binance: totals.binance, okx: totals.okx, bingx: totals.bingx },
                            total,
                            brokerTree, assetTree,
                            details,
                            meta: {
                                builtFrom: ['binance','okx','bingx'],
                                currency: 'USDT',
                                generatedAt: new Date(),
                                priceInfo,
                                schemaVersion: 2
                            }
                        }
                    },
                    { upsert: true }
                );
                console.log(`[Snapshot Service] Synced TODAY for ${user._id} with total: ${total}`);
            }

        } catch (err) {
            console.error(`[Snapshot Service] Failed for user ${user._id}:`, err.message);
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
    getRecentSnapshotsForUser,
};
