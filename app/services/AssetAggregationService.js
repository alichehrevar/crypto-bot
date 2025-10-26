// app/services/AssetAggregationService.js
// Normalizes & values ALL balances from Binance / OKX / BingX into one canonical shape.

const BinanceAccount = require('../models/BinanceAccount');
const OkxAccount     = require('../models/OkxAccount');
const BingxAccount   = require('../models/BingxAccount');

const BinanceWS = require('./binanceWS');
const OkxWS     = require('./okxWS');
const BingxWS   = require('./bingXWS');

const CoinGecko = require('./api/coinGeckoService'); // must export getPriceInUSDT(symbol)

// ---------- utils ----------
const BROKER_COLORS = { Binance: '#30B5D3', OKX: '#DDE000', BingX: '#00E0D5' };
const STABLES = new Set(['USDT','USDC','BUSD','DAI','FDUSD','TUSD','EURS']);

const fix2 = (n) => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
const sum  = (arr) => arr.reduce((a, b) => a + b, 0);

// in-run price cache (key: 'BTC' -> price in USDT)
const priceCache = new Map();

function normalizeSymbol(sym) {
    return String(sym || '').trim().toUpperCase();
}

async function getPriceUSDT(symbol) {
    const s = normalizeSymbol(symbol);
    if (!s) return 0;
    if (priceCache.has(s)) return priceCache.get(s);
    if (STABLES.has(s)) { priceCache.set(s, 1); return 1; }
    // CoinGecko adapter should internally map tickers to ids
    let p = 0;
    try { p = Number(await CoinGecko.getPriceInUSDT(s)) || 0; } catch (_) { p = 0; }
    priceCache.set(s, p);
    return p;
}

function mapBalancesToRows(balances) {
    // balances: [{ asset, free, locked, amount? }, ...]
    if (!Array.isArray(balances)) return [];
    return balances.map((b) => {
        const asset  = normalizeSymbol(b.asset);
        const free   = Number(b.free || 0);
        const locked = Number(b.locked || 0);
        const amount = b.amount != null ? Number(b.amount) : (free + locked);
        return { asset, free, locked, amount };
    });
}

async function valuateBalances(rows) {
    const out = [];
    for (const r of rows) {
        const price = await getPriceUSDT(r.asset);
        out.push({ ...r, value: fix2(r.amount * price) });
    }
    return out;
}

function normalizeAccountType(rawType) {
    const t = String(rawType || '').toLowerCase();
    if (t.includes('spot'))    return 'Spot';
    if (t.includes('funding')) return 'Funding';
    if (t.includes('margin'))  return 'Margin';
    if (t.includes('future') || t.includes('swap') || t.includes('perp')) return 'Futures';
    if (t.includes('saving'))  return 'Savings';
    if (t.includes('stake'))   return 'Staking';
    if (t.includes('earn') || t.includes('vault') || t.includes('pool'))  return 'Earn';
    return 'Other';
}

function safeNum(v) { return Number.isFinite(Number(v)) ? Number(v) : 0; }

// ---------- core: normalize one broker ----------

/**
 * Expected service shape (per account) from your WS services:
 * [
 *   {
 *     accountType: 'Spot'|'Future'|'Fund'|...,
 *     subType?:    'USDT-M'|'COIN-M'|'Cross'|'Isolated'|...,
 *     mode?:       string,
 *     balances?:   [{ asset, free, locked, amount? }],
 *     products?:   [{ product, asset, amount, value?, apy?, lockType? }],
 *     liabilities?:[{ asset, amount, value?, type? }],
 *     positions?:  [{ symbol, side, size, leverage, marginType, entryPrice, markPrice, liqPrice, notional, unrealizedPnl }],
 *     walletBalance?: number,
 *     availableBalance?: number,
 *     totalUnrealizedPnl?: number,
 *   },
 *   ...
 * ]
 */
async function collectBrokerDetails(label, color, accounts, svc) {
    if (!accounts || !accounts.length) return null;

    // fetch sections across all accounts
    const sections = (await Promise.all(accounts.map((a) => svc.getDetailedBalance(a)))).flat();

    // bucket by (type, subType)
    const keyed = {};
    for (const sec of sections) {
        const type    = normalizeAccountType(sec.accountType || sec.type);
        const subType = String(sec.subType || sec.marginType || sec.mode || '').trim();
        const key     = `${type}::${subType}`;

        if (!keyed[key]) {
            keyed[key] = {
                type,
                subType,
                mode: sec.mode || '',
                balances: [],
                products: [],
                liabilities: [],
                positions: [],
                walletBalance: 0,
                availableBalance: 0,
                totalUnrealizedPnl: 0,
            };
        }
        const b = keyed[key];

        if (Array.isArray(sec.balances))    b.balances.push(...mapBalancesToRows(sec.balances));
        if (Array.isArray(sec.products))    b.products.push(...sec.products);
        if (Array.isArray(sec.liabilities)) b.liabilities.push(...sec.liabilities);
        if (Array.isArray(sec.positions))   b.positions.push(...sec.positions.map((p) => ({
            symbol:        String(p.symbol || '').toUpperCase(),
            side:          String(p.side || 'UNKNOWN').toUpperCase(),
            size:          safeNum(p.size || p.qty),
            leverage:      safeNum(p.leverage),
            marginType:    String(p.marginType || 'UNKNOWN').toUpperCase(),
            entryPrice:    safeNum(p.entryPrice),
            markPrice:     safeNum(p.markPrice),
            liqPrice:      safeNum(p.liqPrice),
            notional:      safeNum(p.notional),
            unrealizedPnl: safeNum(p.unrealizedPnl || p.uPnl),
        })));

        b.walletBalance      += safeNum(sec.walletBalance);
        b.availableBalance   += safeNum(sec.availableBalance);
        b.totalUnrealizedPnl += safeNum(sec.totalUnrealizedPnl);
    }

    // value/price each bucket
    const accountsOut = [];
    for (const k of Object.keys(keyed)) {
        const b = keyed[k];

        // value balances
        const valuedBalances = await valuateBalances(b.balances);

        // value products (earn/staking/savings)
        const valuedProducts = [];
        for (const p of b.products) {
            const asset  = normalizeSymbol(p.asset);
            const amount = safeNum(p.amount);
            const price  = await getPriceUSDT(asset);
            const v      = p.value != null ? safeNum(p.value) : amount * price;
            valuedProducts.push({
                product:  p.product || b.type,
                asset,
                amount,
                value: fix2(v),
                apy: safeNum(p.apy),
                lockType: p.lockType || ''
            });
        }

        // value liabilities (e.g., margin loans)
        const valuedLiabs = [];
        for (const L of b.liabilities) {
            const asset  = normalizeSymbol(L.asset);
            const amount = safeNum(L.amount);
            const price  = await getPriceUSDT(asset);
            const v      = L.value != null ? safeNum(L.value) : amount * price;
            valuedLiabs.push({
                asset,
                amount,
                value: fix2(v),
                type: L.type || 'MarginLoan'
            });
        }

        // compute bucket value:
        // - Futures: walletBalance + totalUnrealizedPnl (do not double-count notional)
        // - Others:  sum(balances) + sum(products) − sum(liabilities)
        const balancesValue    = sum(valuedBalances.map((x) => x.value));
        const productsValue    = sum(valuedProducts.map((x) => x.value));
        const liabilitiesValue = sum(valuedLiabs.map((x) => x.value));

        const bucketValue = (b.type === 'Futures')
            ? fix2(b.walletBalance + b.totalUnrealizedPnl)
            : fix2(balancesValue + productsValue - liabilitiesValue);

        accountsOut.push({
            type: b.type,
            subType: b.subType,
            mode: b.mode,
            balances: valuedBalances,
            products: valuedProducts,
            liabilities: valuedLiabs,
            positions: b.positions,
            walletBalance: fix2(b.walletBalance),
            availableBalance: fix2(b.availableBalance),
            totalUnrealizedPnl: fix2(b.totalUnrealizedPnl),
            value: bucketValue
        });
    }

    // per-broker totals
    const totals = {
        spot:    fix2(sum(accountsOut.filter((a) => a.type === 'Spot')   .map((a) => a.value))),
        margin:  fix2(sum(accountsOut.filter((a) => a.type === 'Margin') .map((a) => a.value))),
        funding: fix2(sum(accountsOut.filter((a) => a.type === 'Funding').map((a) => a.value))),
        futures: fix2(sum(accountsOut.filter((a) => a.type === 'Futures').map((a) => a.value))),
        earn:    fix2(sum(accountsOut.filter((a) => ['Earn','Savings','Staking'].includes(a.type)).map((a) => a.value))),
    };
    totals.overall = fix2(totals.spot + totals.margin + totals.funding + totals.futures + totals.earn);

    if (totals.overall <= 0) return null;

    return {
        broker: label,
        color,
        accounts: accountsOut.sort((a, b) => b.value - a.value),
        totals
    };
}

// ---------- public: collect all brokers for a user ----------

async function collectAllDetailsForUser(userId) {
    // reset per-call price cache
    priceCache.clear();

    const [binanceAccts, okxAccts, bingxAccts] = await Promise.all([
        BinanceAccount.find({ userId }).lean(),
        OkxAccount.find({ userId }).lean(),
        BingxAccount.find({ userId }).lean()
    ]);

    const [binance, okx, bingx] = await Promise.all([
        collectBrokerDetails('Binance', BROKER_COLORS.Binance, binanceAccts, BinanceWS),
        collectBrokerDetails('OKX',     BROKER_COLORS.OKX,     okxAccts,     OkxWS),
        collectBrokerDetails('BingX',   BROKER_COLORS.BingX,   bingxAccts,   BingxWS),
    ]);

    const details = [binance, okx, bingx].filter(Boolean);

    const totals = {
        binance: details.find((d) => d?.broker === 'Binance')?.totals.overall || 0,
        okx:     details.find((d) => d?.broker === 'OKX')?.totals.overall || 0,
        bingx:   details.find((d) => d?.broker === 'BingX')?.totals.overall || 0,
    };
    const total = fix2((totals.binance || 0) + (totals.okx || 0) + (totals.bingx || 0));

    const missing = Array.from(priceCache.entries())
        .filter(([, v]) => !v)
        .map(([k]) => k);

    return {
        details,
        totals,
        total,
        priceInfo: { missing, source: 'coingecko' }
    };
}

module.exports = {
    collectAllDetailsForUser,
};
