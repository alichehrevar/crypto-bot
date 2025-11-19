// services/snapshots/helpers.js
const BinanceService = require('./binanceWS');
const OkxService     = require('./okxWS');
const BingxService   = require('./bingxWS');

const BROKER_COLORS = {
    Binance: '#30B5D3',
    OKX:     '#DDE000',
    BingX:   '#87D30D',
};

// Meta nodes that shouldn't count toward totals
const EXCLUDE_FROM_TOTAL = new Set(['Overview', 'Trading-Equity']);

// ---- Map a broker node (from your WS services) to AccountBucketSchema ----
function nodeToAccountBucket(broker, node) {
    const name = String(node.accountType || node.name || '').toUpperCase();

    // Decide canonical type + subType for your model
    let type = 'Other';
    let subType = String(node.subType || '');

    if (name.startsWith('SPOT')) type = 'Spot';
    else if (name === 'FUNDING') type = 'Funding';
    else if (name.startsWith('MARGIN')) {
        type = 'Margin';
        if (!subType) {
            subType = name.includes('ISOLATED') ? 'Isolated' : (name.includes('CROSS') ? 'Cross' : '');
        }
    }
    else if (name.startsWith('FUTURES') || name === 'FUTURES' || name === 'FUTURE') {
        type = 'Futures';
        // normalize common subTypes
        if (!subType) {
            if (name.includes('USDTM')) subType = 'USDT-M';
            else if (name.includes('COINM')) subType = 'COIN-M';
            else if (name.includes('SWAP')) subType = 'SWAP';
        }
    }
    else if (name === 'FINANCIAL' || name === 'FUND' || name === 'EARN' || name === 'SAVINGS' || name === 'STAKING') {
        type = 'Earn';
    }

    // positions (if provided by service)
    const positions = Array.isArray(node.positions) ? node.positions.map(p => ({
        symbol:        String(p.symbol || p.instId || ''),
        side:          String(p.side || 'UNKNOWN'),
        size:          Number(p.size || p.positionAmt || p.qty || 0),
        leverage:      Number(p.leverage || 0),
        marginType:    String(p.marginType || '').toUpperCase() || 'UNKNOWN',
        entryPrice:    Number(p.entryPrice || 0),
        markPrice:     Number(p.markPrice || 0),
        liqPrice:      Number(p.liqPrice || p.liquidationPrice || 0),
        notional:      Number(p.notional || p.positionValue || p.notionalUsd || 0),
        unrealizedPnl: Number(p.unrealizedPnl || p.uPnl || p.upl || p.unRealizedProfit || 0),
    })) : [];

    // balances/products/liabilities are not emitted by all brokers; keep arrays empty if unknown
    const bucket = {
        type,
        subType,
        mode: '',
        balances: [],
        products: [],
        liabilities: [],
        positions,
        walletBalance:      Number(node.walletBalance || node.walletValueUSDT || 0),
        availableBalance:   Number(node.availableBalance || 0),
        totalUnrealizedPnl: Number(node.totalUnrealizedPnl || 0),
        value:              Number(node.value || 0),
    };

    // If the node exposes detailed “balances” shape, copy to model
    if (Array.isArray(node.balances)) {
        bucket.balances = node.balances.map(b => ({
            asset:  String(b.asset || b.name || ''),
            free:   Number(b.free || 0),
            locked: Number(b.locked || 0),
            amount: Number(b.amount != null ? b.amount : (Number(b.free || 0) + Number(b.locked || 0))),
            value:  Number(b.value || 0),
        }));
    }

    // If “children” are leaf assets with {name,value}, keep them as balances (value only)
    // NOTE: We do not put these into balances by default (keeps model semantic);
    // they will be used to build brokerTree & assetTree later.

    // Earn products (if available in any broker)
    if (Array.isArray(node.products)) {
        bucket.products = node.products.map(p => ({
            product:  String(p.product || 'Earn'),
            asset:    String(p.asset || ''),
            amount:   Number(p.amount || 0),
            value:    Number(p.value || 0),
            apy:      Number(p.apy || 0),
            lockType: String(p.lockType || ''),
        }));
    } else if ((node.accountType || '').toLowerCase().includes('financial') && node.value) {
        // Fallback: a single Earn line when broker only gives total
        bucket.products = [{ product: 'Earn', asset: 'USDT', amount: 0, value: Number(node.value) }];
    }

    return bucket;
}

// ---- Collect full details for a user across brokers (normalized for AssetSnapshot.details) ----
async function collectAllDetailsForUser(userId, { BinanceAccount, OkxAccount, BingxAccount }) {
    const [binanceAccts, okxAccts, bingxAccts] = await Promise.all([
        BinanceAccount.find({ userId }).lean(),
        OkxAccount.find({ userId }).lean(),
        BingxAccount.find({ userId }).lean(),
    ]);

    // helper to call service per-account
    const load = async (accounts, Service) => {
        if (!accounts?.length) return [];
        const out = [];
        for (const acc of accounts) {
            try {
                const raw = await Service.getDetailedBalance(acc);
                out.push({ account: acc, raw: Array.isArray(raw) ? raw : [] });
            } catch (e) {
                console.error(`[collectAllDetailsForUser] ${Service.constructor?.name || 'Svc'} failed:`, e.message);
            }
        }
        return out;
    };

    const [binanceRaw, okxRaw, bingxRaw] = await Promise.all([
        load(binanceAccts, BinanceService),
        load(okxAccts,     OkxService),
        load(bingxAccts,   BingxService),
    ]);

    // Build BrokerDetailsSchema for each broker
    const buildBrokerDetails = (brokerName, color, rawList) => {
        const accounts = [];
        let totals = { spot:0, margin:0, funding:0, futures:0, earn:0, overall:0 };

        for (const entry of rawList) {
            const accountBuckets = [];

            for (const node of entry.raw) {
                const label = String(node.accountType || node.name || '');
                if (EXCLUDE_FROM_TOTAL.has(label)) continue;
                const bucket = nodeToAccountBucket(brokerName, node);
                accountBuckets.push(bucket);

                // accumulate broker totals by bucket type
                if (bucket.value > 0) {
                    switch (bucket.type) {
                        case 'Spot':    totals.spot    += bucket.value; break;
                        case 'Margin':  totals.margin  += bucket.value; break;
                        case 'Funding': totals.funding += bucket.value; break;
                        case 'Futures': totals.futures += bucket.value; break;
                        case 'Earn':    totals.earn    += bucket.value; break;
                        default: break;
                    }
                    totals.overall += bucket.value;
                }
            }

            // one entry per account
            accounts.push(...accountBuckets);
        }

        return {
            broker: brokerName,
            color,
            accounts,  // flattened; schema allows a list of account buckets
            totals,
        };
    };

    const binanceDetails = buildBrokerDetails('Binance', BROKER_COLORS.Binance, binanceRaw);
    const okxDetails     = buildBrokerDetails('OKX',     BROKER_COLORS.OKX,     okxRaw);
    const bingxDetails   = buildBrokerDetails('BingX',   BROKER_COLORS.BingX,   bingxRaw);

    // Totals per broker + grand total
    const totals = {
        binance: Number(binanceDetails.totals.overall.toFixed(8)),
        okx:     Number(okxDetails.totals.overall.toFixed(8)),
        bingx:   Number(bingxDetails.totals.overall.toFixed(8)),
    };
    const total = Number((totals.binance + totals.okx + totals.bingx).toFixed(8));

    const details = [binanceDetails, okxDetails, bingxDetails];

    // We priced in-house (via each exchange tickers). Expose a neutral meta.
    const priceInfo = { missing: [], source: 'exchange-tickers' };

    return { details, totals, total, priceInfo };
}

// ---- Build UI Trees for snapshot from normalized details ----
// Build Broker/Asset trees from normalized details (AssetSnapshot.details)
function buildTreesFromDetails(details) {
    let brokerTotal = 0;
    const brokerChildren = [];

    // asset aggregator: { BTC: { name:'BTC', value, children:[{name:'BingX', value, color}] } }
    const assetMap = new Map();
    const pushAsset = (asset, brokerName, color, value) => {
        if (!asset || !Number.isFinite(value) || value <= 0) return;
        if (!assetMap.has(asset)) {
            assetMap.set(asset, { name: asset, color: undefined, value: 0, children: [] });
        }
        const node = assetMap.get(asset);
        node.value += value;
        const existing = node.children.find(c => c.name === brokerName);
        if (existing) existing.value += value;
        else node.children.push({ name: brokerName, value, color });
    };

    for (const broker of details) {
        const bName = broker.broker;
        const color = broker.color || BROKER_COLORS[bName] || '#999';

        const accountsByLabel = {};
        let perBrokerTotal = 0;

        for (const acc of broker.accounts) {
            const label = acc.type; // 'Spot','Futures','Funding','Margin','Earn','Other'
            if (!accountsByLabel[label]) accountsByLabel[label] = { name: label, value: 0, children: [] };

            if (Number.isFinite(acc.value) && acc.value > 0) {
                accountsByLabel[label].value += acc.value;
                perBrokerTotal += acc.value;
            }

            // 1) Balances -> both trees
            if (Array.isArray(acc.balances) && acc.balances.length) {
                for (const b of acc.balances) {
                    const v = Number(b.value || 0);
                    const amt = Number(b.amount || 0);
                    if (v > 0) {
                        accountsByLabel[label].children.push({ name: b.asset, value: v, amount: amt });
                        pushAsset(b.asset, bName, color, v);
                    }
                }
            }

            // 2) Futures handling
            if (acc.type === 'Futures') {
                // broker tree: show wallet & positions
                if (acc.walletBalance > 0) {
                    accountsByLabel[label].children.push({ name: 'Wallet', value: Number(acc.walletBalance) });
                    // asset tree: count futures wallet as USDT collateral
                    pushAsset('USDT', bName, color, Number(acc.walletBalance));
                }
                if (Array.isArray(acc.positions) && acc.positions.length) {
                    for (const p of acc.positions) {
                        const v = Math.abs(Number(p.notional || 0));
                        if (v > 0.01) {
                            accountsByLabel[label].children.push({ name: p.symbol, value: v });
                            // DO NOT push to assetMap for positions to avoid double counting
                        }
                    }
                }
            }

            // 3) Earn products -> both trees (usually USDT)
            if (acc.type === 'Earn' && Array.isArray(acc.products) && acc.products.length) {
                for (const p of acc.products) {
                    const v = Number(p.value || 0);
                    if (v > 0) {
                        accountsByLabel[label].children.push({ name: p.product || p.asset || 'Earn', value: v });
                        pushAsset(p.asset || 'USDT', bName, color, v);
                    }
                }
            }
        }

        if (perBrokerTotal > 0.01) {
            brokerTotal += perBrokerTotal;
            brokerChildren.push({
                name: bName,
                color,
                value: perBrokerTotal,
                children: Object.values(accountsByLabel).sort((a,b) => b.value - a.value),
            });
        }
    }

    const brokerTree = {
        name: 'Total Holdings',
        value: brokerTotal,
        children: brokerChildren.sort((a,b) => b.value - a.value),
    };

    const assetChildren = Array.from(assetMap.values())
        .filter(n => n.value > 0.0001)
        .sort((a,b) => b.value - a.value);

    const assetTree = {
        name: 'Total Assets',
        value: assetChildren.reduce((s, n) => s + n.value, 0),
        children: assetChildren
    };

    return { brokerTree, assetTree };
}

const toFixed2 = (n) => Number(Number(n || 0).toFixed(2));

module.exports = {
    collectAllDetailsForUser,
    buildTreesFromDetails,
    toFixed2,
};
