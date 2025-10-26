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

const { collectAllDetailsForUser } = require('./AssetAggregationService');

const BROKER_COLORS = {
    Binance: '#30B5D3',
    Kraken: '#87D30D', // keep for future if you add
    Coinbase: '#E0AC00',
    Bybit: '#00E0D5',
    OKX: '#DDE000',
    BingX: '#00E0D5'
};

function sum(arr) { return arr.reduce((a, b) => a + b, 0); }
function toFixed2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }

function buildTreesFromDetails(details) {
    const fix2 = n => Math.round((Number(n)+Number.EPSILON)*100)/100;
    const sum = arr => arr.reduce((a,b)=>a+b,0);

    // ----- Broker-centric tree -----
    const brokerChildren = details.map(d => {
        // spot/fund/earn/etc
        const spotBuckets    = d.accounts.filter(a => a.type === 'Spot');
        const fundBuckets    = d.accounts.filter(a => ['Earn','Savings','Staking'].includes(a.type));
        const fundingBuckets = d.accounts.filter(a => a.type === 'Funding');
        const marginBuckets  = d.accounts.filter(a => a.type === 'Margin');
        const futuresBuckets = d.accounts.filter(a => a.type === 'Futures');

        const children = [];

        // Spot
        for (const a of spotBuckets) {
            children.push({
                name: 'Spot',
                value: a.value,
                children: (a.balances || [])
                    .map(x => ({ name: x.asset, value: x.value }))
                    .sort((x,y) => y.value - x.value)
            });
        }

        // Futures (wallet + positions)
        for (const a of futuresBuckets) {
            const futKids = [];
            if (a.walletBalance > 0) {
                futKids.push({ name: 'Wallet', value: fix2(a.walletBalance) }); // wallet is in USDT for USDT-M
            }
            if (Array.isArray(a.positions) && a.positions.length) {
                futKids.push(
                    ...a.positions
                        .filter(p => Number.isFinite(p.notional) && Math.abs(p.notional) > 0)
                        .map(p => ({ name: p.symbol, value: fix2(Math.abs(p.notional)) }))
                        .sort((x,y) => y.value - x.value)
                );
            }
            // value already equals walletBalance + totalUPnL (per aggregator)
            children.push({
                name: 'Future',
                value: a.value,
                children: futKids
            });
        }

        // Earn/Fund (group under 'Fund' to match UI sample)
        for (const a of fundBuckets) {
            children.push({
                name: 'Fund',
                value: a.value,
                children: (a.products || [])
                    .map(x => ({ name: x.product || a.type, value: x.value }))
                    .sort((x,y) => y.value - x.value)
            });
        }

        // Funding wallet
        for (const a of fundingBuckets) {
            children.push({
                name: 'Funding',
                value: a.value,
                children: (a.balances || [])
                    .map(x => ({ name: x.asset, value: x.value }))
                    .sort((x,y) => y.value - x.value)
            });
        }

        // Margin
        for (const a of marginBuckets) {
            children.push({
                name: 'Margin',
                value: a.value,
                children: (a.balances || [])
                    .map(x => ({ name: x.asset, value: x.value }))
                    .sort((x,y) => y.value - x.value)
            });
        }

        const brokerValue = fix2(sum(children.map(c => c.value)));
        return {
            name: d.broker,
            color: d.color,
            value: brokerValue,
            children: children.filter(c => c.value > 0).sort((x,y) => y.value - x.value)
        };
    }).filter(x => x.value > 0).sort((a,b) => b.value - a.value);

    const brokerTotal = fix2(sum(brokerChildren.map(c => c.value)));
    const brokerTree = { name: 'Total Holdings', value: brokerTotal, children: brokerChildren };

    // ----- Asset-centric tree -----
    const assetMap = new Map();

    const addAsset = (asset, broker, v) => {
        if (!v || v <= 0) return;
        const key = asset.toUpperCase();
        if (!assetMap.has(key)) assetMap.set(key, { total: 0, byBroker: new Map() });
        const E = assetMap.get(key);
        E.total += v;
        E.byBroker.set(broker, (E.byBroker.get(broker) || 0) + v);
    };

    for (const d of details) {
        for (const acc of d.accounts) {
            // Include Spot/Funding/Margin balances and Earn products
            if (['Spot','Funding','Margin','Earn','Savings','Staking'].includes(acc.type)) {
                for (const b of (acc.balances || [])) addAsset(b.asset, d.broker, b.value);
                for (const p of (acc.products || [])) addAsset(p.asset, d.broker, p.value);
            }

            // Include FUTURES WALLET into assets (treat USDT-M as USDT)
            if (acc.type === 'Futures') {
                const wallet = Number(acc.walletBalance || 0);
                if (wallet > 0) {
                    // If you can detect coin-m vs usdt-m, toggle here; default to USDT
                    addAsset('USDT', d.broker, wallet);
                }
                // NOTE: We *don’t* add position notional to asset-centric view by default.
                // If you want it, uncomment below:
                // for (const p of (acc.positions || [])) addAsset(p.symbol, d.broker, Math.abs(Number(p.notional || 0)));
            }
        }
    }

    const assetChildren = Array.from(assetMap.entries()).map(([asset, data]) => ({
        name: asset,
        value: fix2(data.total),
        children: Array.from(data.byBroker.entries())
            .map(([brokerName, v]) => ({ name: brokerName, value: fix2(v) }))
            .sort((a,b) => b.value - a.value)
    })).sort((a,b) => b.value - a.value);

    const assetTree = { name: 'Total Assets', value: brokerTotal, children: assetChildren };

    return { brokerTree, assetTree };
}

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
                        Promise.all(bingxAccts.map(acc => BingxService.getHistoricalBalance(acc, dateToCheck))).then(r => r.reduce((a,b)=>a + (Number(b)||0),0)), // if 0-stub, fine
                    ]);

                    const total = toFixed2(binanceHist + okxHist + bingxHist);
                    if (total > 0) {
                        await AssetSnapshot.create({
                            userId: user._id,
                            timestamp: dateToCheck,
                            balances: { binance: binanceHist, okx: okxHist, bingx: bingxHist },
                            total,
                            brokerTree: null, assetTree: null, // not reconstructable reliably
                            details: [],
                            meta: { builtFrom: ['binance','okx','bingx'], notes: 'Backfilled totals only' }
                        });
                        console.log(`[Snapshot Service] Backfilled ${user._id} on ${dateString} total: ${total}`);
                    }
                }
            }

            // -------- Today: FULL details + trees ----------
            const { details, totals, total, priceInfo } = await collectAllDetailsForUser(user._id);
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
                                priceInfo
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
