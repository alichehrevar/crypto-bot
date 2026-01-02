// app/services/BinanceWS.js

const WebSocket = require('ws');
const axios     = require('axios');
const crypto    = require('crypto'); // for signature generation
const BotBase   = require('../models/BotBase');       // updated: use the discriminator‐based model
const candleStore = require('../../utils/candleStore');
const wsServer  = require('./WebSocketServer');
const BotService = require('./botService/BotService');

class BinanceWS {
    constructor() {
        this.ws = null;
        this.base = 'https://api.binance.com';
    }

    _sign(params, secret) {
        const query = new URLSearchParams(params).toString();
        const signature = crypto.createHmac('sha256', secret).update(query).digest('hex');
        return query + '&signature=' + signature;
    }


    connect() {

        console.log('[BinanceWS] Attempting to connect to Binance WebSocket...')

        // Connect to Binance's miniTicker stream (all-symbol 1m updates).
        this.ws = new WebSocket('wss://stream.binance.com:9443/ws/!miniTicker@arr');

        this.ws.on('open', () => {
            console.log('[BinanceWS] Connected to Binance WebSocket');
        });

        this.ws.on('message', async (data) => {
            try {
                const tickers = JSON.parse(data);
                await this.processTickers(tickers);
            } catch (error) {
                console.error('[BinanceWS] WS message processing error:', error);
            }
        });

        this.ws.on('error', (err) => {
            console.error('[BinanceWS] WebSocket error:', err);
        });
    }

    async processTickers(tickers) {

        try {
            // 1) Fetch all active bots from the database, grab their symbols (e.g. "BTC/USDT").
            const activeBots = await BotBase.find({ active: true }).select('symbol').lean();
            const activeSymbolsSet = new Set(
                activeBots.map(bot => bot.symbol.toUpperCase())
            );

            // 2) Process each ticker in parallel
            await Promise.all(
                tickers.map(async (ticker) => {
                    try {
                        if (!ticker.s || !ticker.o || !ticker.h || !ticker.l || !ticker.c || !ticker.v || !ticker.E) {
                            return;
                        }

                        let symbol;
                        const upperTickerSymbol = ticker.s.toUpperCase();
                        if (upperTickerSymbol.endsWith('USDT')) {
                            symbol = `${upperTickerSymbol.slice(0, -4)}/USDT`;
                        } else if (upperTickerSymbol.endsWith('USDC')) {
                            symbol = `${upperTickerSymbol.slice(0, -4)}/USDC`;
                        } else {
                            symbol = upperTickerSymbol;
                        }
                        symbol = symbol.toUpperCase();

                        if (!activeSymbolsSet.has(symbol.replaceAll('/USDT', ''))) {
                            return;
                        }

                        const timestamp = new Date(ticker.E);
                        const timeframe = '1m';

                        // Construct Candle Data Object
                        const candleData = {
                            symbol,
                            timeframe,
                            timestamp,
                            open: parseFloat(ticker.o),
                            high: parseFloat(ticker.h), // Trust ticker's high/low
                            low: parseFloat(ticker.l),
                            close: parseFloat(ticker.c),
                            volume: parseFloat(ticker.v),
                            isClosed: ticker.x // Use Binance's Explicit Close Flag
                        };

                        // FIX: Use Safe Candle Store (Update DB + Memory)
                        await candleStore.updateCandle(symbol, timeframe, candleData);

                        // Broadcast to UI
                        wsServer.broadcastCandle(candleData);

                        // Trigger Bots
                        await BotService.processCandle(symbol, timeframe, candleData);
                    }
                    catch (error) {
                        console.error(`Error processing ticker ${ticker.s}:`, error);
                    }
                })
            );
        } catch (error) {
            console.error('Global ticker processing error:', error);
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    /**
     * @description Fetches the total SPOT account balance from a daily account snapshot for a specific past date.
     * Note: The Binance Snapshot API only provides data for SPOT accounts. Futures history is not included.
     * @param {object} account The user's Binance account credentials.
     * @param {Date} date The specific date for which to fetch the balance.
     * @returns {Promise<number>} The total USDT value (free + locked) for that day.
     */
    async getHistoricalBalance(account, date) {
        const { apiKey, secretKey } = account;
        // Binance expects timestamps in milliseconds. We'll define a 24-hour window for the requested date.
        const startTime = new Date(date);
        startTime.setUTCHours(0, 0, 0, 0);

        const endTime = new Date(date);
        endTime.setUTCHours(23, 59, 59, 999);

        const params = {
            type: 'SPOT',
            startTime: startTime.getTime(),
            endTime: endTime.getTime(),
            limit: 1, // We only need one snapshot within the 24-hour window.
            timestamp: Date.now()
        };

        const queryString = new URLSearchParams(params).toString();
        const signature = crypto.createHmac('sha256', secretKey).update(queryString).digest('hex');
        const url = `https://api.binance.com/sapi/v1/accountSnapshot?${queryString}&signature=${signature}`;

        try {
            const resp = await axios.get(url, { headers: { 'X-MBX-APIKEY': apiKey } });

            // Check if any snapshots were returned for that day.
            if (!resp.data || !resp.data.snapshotVos || resp.data.snapshotVos.length === 0) {
                console.log(`[BinanceWS] No snapshot found for date ${date.toISOString().slice(0,10)}`);
                return 0;
            }

            // Extract the balances from the first snapshot found.
            const snapshotBalances = resp.data.snapshotVos[0].data.balances;
            const usdtAsset = snapshotBalances.find(b => b.asset === 'USDT');

            // Sum the free and locked amounts to get the total balance for that asset.
            return usdtAsset ? parseFloat(usdtAsset.free) + parseFloat(usdtAsset.locked) : 0;
        } catch (error) {
            console.error(`[BinanceWS] getHistoricalBalance failed:`, error.response?.data || error.message);
            // Return 0 on error to allow the cron job to continue with other users/exchanges.
            return 0;
        }
    }

    /**
     * Returns up to `days` days of realized PnL from Binance USDT‐M futures income history.
     * Shape: [ { timestamp: ms, profit: number }, … ]
     */
    async getHistoricalRealizedPnL(account, { days }) {
        const { apiKey, secretKey } = account;
        const timestamp  = Date.now();
        const recvWindow = 5000;
        const qs = `incomeType=REALIZED_PNL&limit=1000&timestamp=${timestamp}&recvWindow=${recvWindow}`;
        const signature = crypto.createHmac('sha256', secretKey).update(qs).digest('hex');
        const url = `https://fapi.binance.com/fapi/v1/income?${qs}&signature=${signature}`;

        const res = await axios.get(url, { headers: { 'X-MBX-APIKEY': apiKey } });
        // res.data is an array of income records
        if (!Array.isArray(res.data)) {
            throw new Error('Unexpected Binance income response');
        }

        // group by UTC date
        const groups = {};
        for (const inc of res.data) {
            const dateKey = new Date(inc.time).toISOString().slice(0,10);
            const val     = parseFloat(inc.income || 0);
            groups[dateKey] = (groups[dateKey]||0) + val;
        }

        return Object.entries(groups)
            .map(([date, profit]) => ({
                timestamp: new Date(`${date}T00:00:00Z`).getTime(),
                profit
            }))
            .sort((a,b) => b.timestamp - a.timestamp)
            .slice(0, days);
    }

    /**
     * Returns a single‐point snapshot of current unrealized PnL on Binance futures.
     * Shape: [ { timestamp: ms, pct: number } ]
     */
    async getUnrealizedPnLHistory(account, { days }) {
        // Binance only gives “right now”
        const { apiKey, secretKey } = account;
        const timestamp  = Date.now();
        const qs         = `timestamp=${timestamp}`;
        const signature  = crypto.createHmac('sha256', secretKey).update(qs).digest('hex');
        const url        = `https://fapi.binance.com/fapi/v2/positionRisk?${qs}&signature=${signature}`;

        try {
            const res = await axios.get(url, { headers: { 'X-MBX-APIKEY': apiKey } });
            if (!Array.isArray(res.data)) {
                throw new Error('Unexpected Binance positionRisk response');
            }

            // Map over the response to create a standardized object
            return res.data.map(pos => {
                const unrealizedPnl = parseFloat(pos.unrealizedProfit || 0);
                const initialMargin = parseFloat(pos.initialMargin || 0);
                const pnlPercentage = initialMargin > 0 ? (unrealizedPnl / initialMargin) * 100 : 0;

                return {
                    symbol: pos.symbol,
                    leverage: pos.leverage,
                    unrealizedPnl: unrealizedPnl.toFixed(2),
                    pct: parseFloat(pnlPercentage.toFixed(2)),
                    // IMPORTANT: We use `updateTime` as the timestamp for filtering by period
                    timestamp: pos.updateTime
                };
            });
        } catch(err) {
            console.error('[BinanceWS] getUnrealizedPnLHistory Error:', err.response?.data || err.message);
            return [];
        }
    }

    /**
     * @description Fetches a detailed breakdown of assets across Spot, Funding, Margin (cross & isolated),
     * USDⓈ-M Futures, COIN-M Futures, and Earn/Simple. Returns a valued tree in USDT.
     * Node shapes are consistent with your other exchanges: { accountType, value, children? , ... }
     */
    async getDetailedBalance(account) {
        const { apiKey, secretKey } = account;

        // ---------- 0) Price map for USDT valuation ----------
        let priceMap = new Map();
        const toUSDT = (asset, amount) => {
            const a = String(asset || '').toUpperCase();
            const amt = Number(amount || 0);
            if (!Number.isFinite(amt) || amt <= 0) return 0;
            if (a === 'USDT') return amt;
            const px = priceMap.get(`${a}USDT`);
            return px ? amt * px : 0;
        };

        try {
            const pxRes = await axios.get('https://api.binance.com/api/v3/ticker/price');
            // Map like "BTCUSDT" -> lastPrice
            priceMap = new Map((Array.isArray(pxRes.data) ? pxRes.data : []).map(t => [t.symbol, parseFloat(t.price)]));
        } catch (e) {
            console.warn('[BinanceWS] price feed failed; non-USDT valuations may be 0:', e?.message);
        }

        const result = [];

        // Helper: signs a params object for SAPI/FAPI/DAPI
        const signParams = (params, key = secretKey) =>
            new URLSearchParams(params).toString() + '&signature=' +
            crypto.createHmac('sha256', key).update(new URLSearchParams(params).toString()).digest('hex');

        const authHeader = { headers: { 'X-MBX-APIKEY': apiKey } };

        // ---------- 1) SPOT ----------
        try {
            const qs = signParams({ timestamp: Date.now() });
            const url = `https://api.binance.com/api/v3/account?${qs}`;
            const res = await axios.get(url, authHeader);
            const balances = Array.isArray(res.data?.balances) ? res.data.balances : [];

            const items = balances
                .map(b => {
                    const asset = b.asset;
                    const amt = Number(b.free || 0) + Number(b.locked || 0);
                    return { asset, amount: amt, value: toUSDT(asset, amt) };
                })
                .filter(x => x.amount > 1e-10)
                .sort((a, b) => b.value - a.value);

            const spotValue = items.reduce((s, x) => s + (x.value || 0), 0);
            result.push({
                accountType: 'Spot',
                value: Number(spotValue.toFixed(8)),
                children: items
                    .filter(x => x.value > 0.0001)
                    .map(x => ({ name: x.asset, value: Number(x.value.toFixed(8)) }))
            });
        } catch (e) {
            console.error('[BinanceWS] Spot fetch failed:', e?.response?.data || e?.message);
            result.push({ accountType: 'Spot', value: 0, children: [] });
        }

        // ---------- 2) FUNDING WALLET (Funding) ----------
        // User Asset — requires "Enable Spot & Margin Trading" and "Enable Reading" on API key
        try {
            const qs = signParams({ timestamp: Date.now() });
            // v3 endpoint is current; v1 also works on many tenants
            const url = `https://api.binance.com/sapi/v3/asset/getUserAsset?${qs}`;
            const res = await axios.post(url, null, authHeader); // NOTE: POST with empty body per Binance spec
            const rows = Array.isArray(res.data) ? res.data : [];

            const items = rows
                .map(r => {
                    const asset = r.asset;
                    const amt = Number(r.free || 0) + Number(r.locked || 0);
                    return { asset, amount: amt, value: toUSDT(asset, amt) };
                })
                .filter(x => x.amount > 1e-10)
                .sort((a, b) => b.value - a.value);

            const total = items.reduce((s, x) => s + (x.value || 0), 0);

            result.push({
                accountType: 'Funding',
                value: Number(total.toFixed(8)),
                children: items
                    .filter(x => x.value > 0.0001)
                    .map(x => ({ name: x.asset, value: Number(x.value.toFixed(8)) }))
            });
        } catch (e) {
            // Many users have zero Funding or lack permission; keep node but zero.
            console.warn('[BinanceWS] Funding fetch skipped/failed:', e?.response?.data || e?.message);
            result.push({ accountType: 'Funding', value: 0, children: [] });
        }

        // ---------- 3) MARGIN (Cross) ----------
        try {
            const qs = signParams({ timestamp: Date.now() });
            const url = `https://api.binance.com/sapi/v1/margin/account?${qs}`;
            const res = await axios.get(url, authHeader);

            const userAssets = Array.isArray(res.data?.userAssets) ? res.data.userAssets : [];
            const items = userAssets
                .map(a => {
                    const asset = a.asset;
                    // Use netAsset = totalAsset - (borrowed - interest repaid), safest is to sum netAsset if provided
                    const amt = Number(a.netAsset || 0); // netAsset present on margin endpoint
                    return { asset, amount: amt, value: toUSDT(asset, amt) };
                })
                .filter(x => x.amount > 1e-10)
                .sort((a, b) => b.value - a.value);

            const total = items.reduce((s, x) => s + (x.value || 0), 0);
            result.push({
                accountType: 'Margin-Cross',
                value: Number(total.toFixed(8)),
                children: items
                    .filter(x => x.value > 0.0001)
                    .map(x => ({ name: x.asset, value: Number(x.value.toFixed(8)) }))
            });
        } catch (e) {
            console.warn('[BinanceWS] Margin-Cross fetch skipped/failed:', e?.response?.data || e?.message);
            result.push({ accountType: 'Margin-Cross', value: 0, children: [] });
        }

        // ---------- 4) MARGIN (Isolated) ----------
        try {
            const qs = signParams({ timestamp: Date.now() });
            const url = `https://api.binance.com/sapi/v1/margin/isolated/account?${qs}`;
            const res = await axios.get(url, authHeader);

            const assets = Array.isArray(res.data?.assets) ? res.data.assets : [];
            // Each asset has baseAsset/quoteAsset with netAsset
            const items = [];
            for (const pair of assets) {
                const b = pair.baseAsset || {};
                const q = pair.quoteAsset || {};
                const bAmt = Number(b.netAsset || 0);
                const qAmt = Number(q.netAsset || 0);
                if (bAmt > 1e-10) items.push({ asset: b.asset, amount: bAmt, value: toUSDT(b.asset, bAmt) });
                if (qAmt > 1e-10) items.push({ asset: q.asset, amount: qAmt, value: toUSDT(q.asset, qAmt) });
            }
            items.sort((a, b) => b.value - a.value);
            const total = items.reduce((s, x) => s + (x.value || 0), 0);

            result.push({
                accountType: 'Margin-Isolated',
                value: Number(total.toFixed(8)),
                children: items
                    .filter(x => x.value > 0.0001)
                    .map(x => ({ name: x.asset, value: Number(x.value.toFixed(8)) }))
            });
        } catch (e) {
            console.warn('[BinanceWS] Margin-Isolated fetch skipped/failed:', e?.response?.data || e?.message);
            result.push({ accountType: 'Margin-Isolated', value: 0, children: [] });
        }

        // ---------- 5) USDⓈ-M Futures (USDT-M) ----------
        try {
            const baseQs = { timestamp: Date.now() };
            const futQs = signParams(baseQs);
            const balUrl = `https://fapi.binance.com/fapi/v2/balance?${futQs}`;
            const posUrl = `https://fapi.binance.com/fapi/v2/positionRisk?${futQs}`;

            const [balRes, posRes] = await Promise.all([
                axios.get(balUrl, authHeader),
                axios.get(posUrl, authHeader)
            ]);

            const walletUSDT = (Array.isArray(balRes.data) ? balRes.data : [])
                .reduce((s, b) => s + (b.asset === 'USDT' ? Number(b.balance || 0) : 0), 0);

            const positions = Array.isArray(posRes.data) ? posRes.data : [];
            let totalUPnL = 0;
            const children = [];

            for (const p of positions) {
                const u = Number(p.unRealizedProfit || p.unrealizedProfit || 0);
                totalUPnL += u;
                const notional = Math.abs(Number(p.notional || 0));
                if (notional > 0.01) {
                    children.push({ name: String(p.symbol), value: notional });
                }
            }

            const futuresValue = walletUSDT + totalUPnL;

            result.push({
                accountType: 'Futures-USDTM',
                walletBalance: Number(walletUSDT.toFixed(8)),
                totalUnrealizedPnl: Number(totalUPnL.toFixed(8)),
                value: Number(futuresValue.toFixed(8)),
                children: children.sort((a, b) => b.value - a.value)
            });
        } catch (e) {
            console.error('[BinanceWS] Futures-USDTM fetch failed:', e?.response?.data || e?.message);
            result.push({
                accountType: 'Futures-USDTM',
                walletBalance: 0,
                totalUnrealizedPnl: 0,
                value: 0,
                children: []
            });
        }

        // ---------- 6) COIN-M Futures (Delivery) ----------
        try {
            const baseQs = { timestamp: Date.now() };
            const dqs = signParams(baseQs);
            const balUrl = `https://dapi.binance.com/dapi/v1/balance?${dqs}`;
            const posUrl = `https://dapi.binance.com/dapi/v1/positionRisk?${dqs}`;

            const [balRes, posRes] = await Promise.all([
                axios.get(balUrl, authHeader),
                axios.get(posUrl, authHeader)
            ]);

            // Balance is in coin terms; try to value to USDT using coin/USDT where possible
            const balances = Array.isArray(balRes.data) ? balRes.data : [];
            const balItems = [];
            let walletValueUSDT = 0;
            for (const b of balances) {
                const asset = b.asset;
                const amt = Number(b.balance || 0);
                const v = toUSDT(asset, amt);
                walletValueUSDT += v;
                if (v > 0.0001) balItems.push({ name: asset, value: v });
            }

            const positions = Array.isArray(posRes.data) ? posRes.data : [];
            let totalUPnL = 0;
            const posItems = [];
            for (const p of positions) {
                const u = Number(p.unRealizedProfit || p.unrealizedProfit || 0);
                totalUPnL += u;
                const notional = Math.abs(Number(p.notionalValue || 0)); // COIN-M often reports notionalValue in USD
                if (notional > 0.01) posItems.push({ name: String(p.symbol), value: notional });
            }

            const children = [...balItems, ...posItems].sort((a, b) => b.value - a.value);
            const totalValue = walletValueUSDT + totalUPnL;

            result.push({
                accountType: 'Futures-COINM',
                walletValueUSDT: Number(walletValueUSDT.toFixed(8)),
                totalUnrealizedPnl: Number(totalUPnL.toFixed(8)),
                value: Number(totalValue.toFixed(8)),
                children
            });
        } catch (e) {
            console.warn('[BinanceWS] Futures-COINM fetch skipped/failed:', e?.response?.data || e?.message);
            result.push({
                accountType: 'Futures-COINM',
                walletValueUSDT: 0,
                totalUnrealizedPnl: 0,
                value: 0,
                children: []
            });
        }

        // ---------- 7) EARN / SIMPLE ----------
        try {
            const qs = signParams({ timestamp: Date.now() });
            const url = `https://api.binance.com/sapi/v1/simple-account?${qs}`;
            const res = await axios.get(url, authHeader);
            const earnTotal = Number(res.data?.totalAmountInUSDT || 0);

            result.push({
                accountType: 'Financial',
                value: Number(earnTotal.toFixed(8)),
                children: earnTotal > 0 ? [{ name: 'Earn/Simple', value: Number(earnTotal.toFixed(8)) }] : []
            });
        } catch (e) {
            console.log('[BinanceWS] Earn/Simple not available:', e?.response?.data || e?.message);
            result.push({ accountType: 'Financial', value: 0, children: [] });
        }

        return result;
    }

    /**
     * Get the USDT balance for a Binance account via REST.
     * Keeps EXACT same return shape as your current implementation:
     *  - all=false  -> returns a NUMBER (spot free USDT)
     *  - all=true   -> returns an ARRAY [{accountType:'spot',...},{accountType:'futures',...}]
     * Internally, we still fetch the detailed tree (for consistency and cache/warmup),
     * but we compute outputs to preserve semantics.
     */
    async getBalance(account, { all = false } = {}) {
        const { apiKey, secretKey } = account;

        // Warm up detailed (doesn't affect return shape, helps cache/telemetry)
        // Ignore errors here — we still must return the legacy shape.
        try { this.getDetailedBalance(account).catch(() => {}); } catch (_) {}

        const signParams = (params) =>
            new URLSearchParams(params).toString() + '&signature=' +
            crypto.createHmac('sha256', secretKey).update(new URLSearchParams(params).toString()).digest('hex');

        const authHeader = { headers: { 'X-MBX-APIKEY': apiKey } };

        // Legacy semantics:
        // - spot-only = SPOT FREE USDT (not total valued spot)
        if (!all) {
            try {
                const qs = signParams({ timestamp: Date.now() });
                const url = `https://api.binance.com/api/v3/account?${qs}`;
                const res = await axios.get(url, authHeader);
                const usdt = (res.data?.balances || []).find(b => b.asset === 'USDT');
                return usdt ? Number(usdt.free || 0) : 0;
            } catch (err) {
                console.error('BinanceWS getBalance error (spot):', err.response?.data || err.message);
                throw err;
            }
        }

        // all=true → array: spot free USDT + futures wallet USDT (total)
        try {
            // Spot
            const spotQs = signParams({ timestamp: Date.now() });
            const spotUrl = `https://api.binance.com/api/v3/account?${spotQs}`;

            // USDⓈ-M futures
            const futQs = signParams({ timestamp: Date.now() });
            const futUrl = `https://fapi.binance.com/fapi/v2/balance?${futQs}`;

            const [spotRes, futRes] = await Promise.all([
                axios.get(spotUrl, authHeader),
                axios.get(futUrl, authHeader)
            ]);

            const spotUsdt = (spotRes.data?.balances || []).find(b => b.asset === 'USDT');
            const spotBalance = spotUsdt ? Number(spotUsdt.free || 0) : 0;

            const futUsdtRow = (Array.isArray(futRes.data) ? futRes.data : []).find(b => b.asset === 'USDT');
            const futBalance  = futUsdtRow ? Number(futUsdtRow.balance || 0) : 0; // total wallet

            return [
                { accountType: 'spot',    usdtBalance: spotBalance.toString() },
                { accountType: 'futures', usdtBalance: futBalance.toString()  }
            ];
        } catch (err) {
            console.error('BinanceWS getBalance error (all):', err.response?.data || err.message);
            throw err;
        }
    }

}

module.exports = new BinanceWS();
