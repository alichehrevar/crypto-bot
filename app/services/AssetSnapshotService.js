/**
 * @file Service for creating daily snapshots of user asset balances.
 */
const User            = require('../models/User');
const BinanceAccount  = require('../models/BinanceAccount');
const OkxAccount      = require('../models/OkxAccount');
const BingxAccount    = require('../models/BingxAccount');
const AssetSnapshot   = require('../models/AssetSnapshot');
const BinanceService  = require('./binanceWS');
const OkxService      = require('./okxWS');
const BingxService    = require('./bingXWS');

/**
 * @description Calculates the total balance for a single user across all their linked exchange accounts.
 * It fetches the complete portfolio value (Spot + Futures).
 * @param {ObjectId} userId The ID of the user.
 * @returns {Promise<object>} An object containing balances per exchange and a total.
 */
async function sumBalancesForUser(userId) {
    const [binAccs, okxAccs, bingxAccs] = await Promise.all([
        BinanceAccount.find({ userId }).lean(),
        OkxAccount.find({ userId }).lean(),
        BingxAccount.find({ userId }).lean(),
    ]);

    // Helper to sum balances for an array of accounts using a given service.
    async function sumFor(accts, svc) {
        let sum = 0;
        for (const acct of accts) {
            // CRITICAL FIX: Pass { all: true } to get the TOTAL portfolio balance (Spot + Futures).
            // CRITICAL FIX 2: Correctly parse the array of balance objects returned by getBalance.
            const balanceArray = await svc.getBalance(acct, { all: true });
            if (balanceArray && balanceArray.length > 0) {
                sum += balanceArray.reduce((acc, curr) => acc + parseFloat(curr.usdtBalance || '0'), 0);
            }
        }
        return sum;
    }

    const [b, o, x] = await Promise.all([
        sumFor(binAccs, BinanceService),
        sumFor(okxAccs, OkxService),
        sumFor(bingxAccs, BingxService)
    ]);

    return { binance: b, okx: o, bingx: x, total: b + o + x };
}

/**
 * @description Iterates through all users and creates a daily balance snapshot for each.
 * Designed to be run as a scheduled cron job. Uses a sequential loop for safety.
 */
async function takeSnapshotAllUsers() {
    console.log('Starting daily asset snapshot generation...');
    const users = await User.find().select('_id').lean();

    // Use a sequential for...of loop to avoid overwhelming services.
    for (const user of users) {
        try {
            const { binance, okx, bingx, total } = await sumBalancesForUser(user._id);

            // Use today's date but set the time to midnight UTC for daily consistency.
            const snapshotDate = new Date();
            snapshotDate.setUTCHours(0, 0, 0, 0);

            // Use updateOne with upsert to create or update today's snapshot, preventing duplicates.
            await AssetSnapshot.updateOne(
                { userId: user._id, timestamp: snapshotDate },
                {
                    $set: {
                        balances: { binance, okx, bingx },
                        total
                    }
                },
                { upsert: true } // Creates the document if it doesn't exist
            );
            console.log(`[AssetSnapshot] Snapshot for user ${user._id} completed.`);
        } catch (error) {
            console.error(`[AssetSnapshot] Failed to create snapshot for user ${user._id}:`, error.message);
        }
    }
    console.log(`[AssetSnapshot] Finished processing ${users.length} users.`);
}

module.exports = { takeSnapshotAllUsers };
