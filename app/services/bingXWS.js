// app/services/bingxWS.js
const WebSocket = require('ws');
const crypto    = require('crypto');
const zlib      = require('zlib');
const axios     = require('axios');
const Candle    = require('../models/Candle');

class BingXWS {
    constructor() {
        this.ws = null;
        this.reconnectInterval = 5000;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.subscriptions = new Map();
        this.pingInterval = null;

        // COIN-M cache fed by your COIN-M socket (see setter below)
        this.coinMWalletValue = 0;     // valued in USDT
        this.coinMTotalUPnL   = 0;     // USDT
        this.coinMChildren    = [];    // [{ name: 'BTC', value: 28.97 }, ...] notional USD leaves
    }

    /* -------------------------- WS & misc utils -------------------------- */

    generateSignature(timestamp, apiSecret) {
        const signString = `timestamp=${timestamp}`;
        return crypto.createHmac('sha256', apiSecret).update(signString).digest('hex');
    }

    connect() {
        if (this.ws) return;
        const endpoint = `wss://open-api-swap.bingx.com/swap-market`;
        this.ws = new WebSocket(endpoint, { perMessageDeflate: false });
        this.ws.binaryType = 'arraybuffer';

        this.ws.on('open', () => {
            console.log('[BingXWS] Connected to BingX WebSocket');
            this.reconnectAttempts = 0;
            this.subscriptions.forEach((sub) => {
                this.sendSubscription(sub.symbol, sub.interval);
            });
        });

        this.ws.on('message', async (data, isBinary) => {
            try {
                let message;
                if (isBinary) message = this.parseBinaryMessage(data);
                else message = JSON.parse(data.toString());
                if (!message) return;

                if (message.ping) { this.handlePing(message.ping); return; }
                if (message.event === 'login') { this.handleAuthResponse(message); return; }
                await this.processMessage(message);
            } catch (err) {
                console.error('[BingXWS] Message processing error:', err);
            }
        });

        this.ws.on('error', (err) => {
            console.error('[BingXWS] WebSocket error:', err);
            this.cleanup();
        });

        this.ws.on('close', (code, reason) => {
            console.warn(`[BingXWS] Connection closed with code ${code}: ${reason}`);
            this.cleanup();
            this.handleReconnect();
        });
    }

    authenticate(timestamp, signature, apiKey) {
        const authMessage = {
            event: "login",
            params: { apiKey, timestamp, signature }
        };
        this.sendWhenReady(authMessage);
    }

    handleAuthResponse(message) {
        if (message.code === 0) console.log('[BingXWS] Authentication successful');
        else {
            console.error('[BingXWS] Authentication failed:', message);
            this.cleanup();
            throw new Error('BingX WebSocket authentication failed');
        }
    }

    handlePing(pingTimestamp) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ pong: pingTimestamp }));
        }
    }

    cleanup() {
        if (this.pingInterval) { clearInterval(this.pingInterval); this.pingInterval = null; }
        if (this.ws) { this.ws.removeAllListeners(); this.ws = null; }
    }

    handleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[BingXWS] Max reconnect attempts reached');
            return;
        }
        const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts);
        console.log(`[BingXWS] Attempting to reconnect in ${delay}ms`);
        setTimeout(() => {
            this.reconnectAttempts++;
            console.log(`[BingXWS] Reconnect attempt ${this.reconnectAttempts}`);
            this.connect();
        }, delay);
    }

    async processMessage(msg) {
        if (!msg || typeof msg !== 'object') return;
        try {
            if (msg.topic && msg.topic.includes('kline')) {
                await this.processKlineMessage(msg);
            } else if (msg.topic && msg.topic.includes('ticker')) {
                await this.processTickerMessage(msg);
            }
        } catch (err) {
            console.error('[BingXWS] Message processing failed:', err);
        }
    }

    async processKlineMessage(msg) {
        const klineData = msg.data;
        if (!klineData) return;

        const [symbol, interval] = msg.topic.split('@');
        const candleData = {
            symbol: symbol.toUpperCase(),
            timeframe: this.mapInterval(interval.replace('kline_', '')),
            timestamp: klineData.t,
            open: parseFloat(klineData.o),
            high: parseFloat(klineData.h),
            low: parseFloat(klineData.l),
            close: parseFloat(klineData.c),
            volume: parseFloat(klineData.v),
            trades: parseInt(klineData.n, 10),
            isClosed: klineData.x
        };

        const isValid = ['open','high','low','close','volume'].every(k => Number.isFinite(candleData[k]));
        if (isValid) await this.upsertCandle(candleData);
        else console.warn('[BingXWS] Invalid candle data:', candleData);
    }

    async processTickerMessage(msg) {
        console.log('[BingXWS] Ticker update:', msg);
    }

    mapInterval(interval) {
        const m = { '1m':'1m','3m':'3m','5m':'5m','15m':'15m','30m':'30m','1h':'1h','2h':'2h','4h':'4h','6h':'6h','8h':'8h','12h':'12h','1d':'1d','3d':'3d','1w':'1w','1M':'1M' };
        return m[interval] || interval;
    }

    async upsertCandle(c) {
        await Candle.findOneAndUpdate(
            { symbol: c.symbol, timeframe: c.timeframe, timestamp: c.timestamp },
            { $set: {
                    open: c.open, high: c.high, low: c.low, close: c.close,
                    volume: c.volume, trades: c.trades, isClosed: c.isClosed
                }},
            { upsert: true, new: true }
        );
    }

    subscribe(symbol, interval) {
        const key = `${symbol}-${interval}`;
        if (!this.subscriptions.has(key)) {
            this.subscriptions.set(key, { symbol, interval });
            this.sendSubscription(symbol, interval);
        }
    }

    unsubscribe(symbol, interval) {
        const key = `${symbol}-${interval}`;
        if (this.subscriptions.has(key)) {
            const unsubscribeMsg = { id: Date.now(), reqType: "unsub", dataType: `${symbol.toLowerCase()}@kline_${interval}` };
            this.sendWhenReady(unsubscribeMsg);
            this.subscriptions.delete(key);
        }
    }

    sendSubscription(symbol, interval) {
        const subscribeMsg = { id: Date.now(), reqType: "sub", dataType: `${symbol.toLowerCase()}@kline_${interval}` };
        this.sendWhenReady(subscribeMsg);
    }

    sendWhenReady(message) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            try { this.ws.send(JSON.stringify(message)); }
            catch (err) { console.error('[BingXWS] Send error:', err); this.handleReconnect(); }
        } else {
            setTimeout(() => this.sendWhenReady(message), 100);
        }
    }

    disconnect() { if (this.ws) { this.cleanup(); this.ws.close(); } }
    isConnected() { return this.ws?.readyState === WebSocket.OPEN; }
    getSubscriptions() { return Array.from(this.subscriptions.values()); }

    parseBinaryMessage(data) {
        const raw = data.toString();
        if (raw === 'Ping' || raw === 'pong' || raw === 'PING') return { ping: Date.now() };
        try {
            const decompressed = zlib.gunzipSync(data).toString();
            const first = decompressed.trim()[0];
            if (first === '{' || first === '[') return JSON.parse(decompressed);
            return { ping: decompressed };
        } catch (e) {
            console.debug('[BingXWS] parseBinaryMessage non-gzip/invalid JSON:', e.message);
            return null;
        }
    }

    /* -------------------------- Simple RESTs used elsewhere -------------------------- */

    async getSpotBalance(account) {
        const { apiKey, secretKey } = account;
        const timestamp = Date.now().toString();
        const base = 'https://open-api.bingx.com';
        const path = '/openApi/spot/v1/account/balance';

        const queryParams = new URLSearchParams({ timestamp });
        const toSign = queryParams.toString();
        const signature = crypto.createHmac('sha256', secretKey).update(toSign).digest('hex');
        queryParams.append('signature', signature);

        const url = `${base}${path}?${queryParams.toString()}`;

        const resp = await axios.get(url, { headers: { "X-BX-APIKEY": apiKey } });
        const json = resp.data;
        if (json.code !== 0) throw new Error(`BingX Spot Balance Error (${json.code}): ${json.msg}`);

        const usdtAsset = json.data.balances.find(b => b.asset === 'USDT');
        return usdtAsset ? parseFloat(usdtAsset.free) : 0;
    }

    async getFuturesBalance(account) {
        const { apiKey, secretKey } = account;
        const timestamp = Date.now().toString();
        const base = 'https://open-api.bingx.com';
        const path = '/openApi/swap/v2/user/balance';

        const queryParams = new URLSearchParams({ timestamp });
        const toSign = queryParams.toString();
        const signature = crypto.createHmac('sha256', secretKey).update(toSign).digest('hex');
        queryParams.append('signature', signature);

        const url = `${base}${path}?${queryParams.toString()}`;

        const resp = await axios.get(url, { headers: { 'X-BX-APIKEY': apiKey } });
        const json = resp.data;
        if (json.code !== 0) throw new Error(`BingX Futures Balance Error (${json.code}): ${json.msg}`);

        const usdtAsset = json.data.balance;
        return usdtAsset ? parseFloat(usdtAsset.balance) : 0;
    }

    /**
     * Keeps EXACT same shape:
     *  - all=false  -> number (spot USDT free)
     *  - all=true   -> [{accountType:'spot', ...}, {accountType:'futures', ...}]
     */
    async getBalance(account, { all = false, accountType = '' } = {}) {
        try {
            if (all) {
                const [spotBalance, futuresBalance] = await Promise.all([
                    this.getSpotBalance(account),
                    this.getFuturesBalance(account)
                ]);
                return [
                    { accountType: 'spot',    usdtBalance: spotBalance.toString() },
                    { accountType: 'futures', usdtBalance: futuresBalance.toString() }
                ];
            }
            if (accountType === 'futures') {
                const futuresBalance = await this.getFuturesBalance(account);
                return [{ accountType: 'futures', usdtBalance: futuresBalance.toString() }];
            }
            const spotBalance = await this.getSpotBalance(account);
            return spotBalance;
        } catch (err) {
            console.error('[BingXWS] getBalance failed:', err.message);
            return all ? [{ accountType: 'error', usdtBalance: '0' }] : 0;
        }
    }

    /* -------------------------- Valued, detailed breakdown -------------------------- */

    /**
     * Return array of broker-specific buckets:
     * [
     *  { accountType:'Spot', value, balances:[{asset,free,locked,amount,value}], children:[{name,value}] },
     *  { accountType:'Futures', subType:'USDT-M', walletBalance, totalUnrealizedPnl, positions:[], value, children:[...] },
     *  { accountType:'Futures', subType:'COIN-M', walletBalance, totalUnrealizedPnl, positions:[], value, children:[...] },
     *  { accountType:'Funding', value, balances:[...], children:[...] }
     * ]
     */
    async getDetailedBalance(account) {
        const { apiKey, secretKey } = account;

        // signed GET helper
        const sendRequest = async (path, params = {}) => {
            const timestamp = Date.now();
            const qs = new URLSearchParams({ ...params, timestamp }).toString();
            const sig = crypto.createHmac('sha256', secretKey).update(qs).digest('hex');
            const url = `https://open-api.bingx.com${path}?${qs}&signature=${sig}`;
            const resp = await axios.get(url, { headers: { 'X-BX-APIKEY': apiKey } });
            if (resp.data?.code !== 0) throw new Error(`BingX API error (${path}): ${resp.data?.msg || 'unknown'}`);
            return resp.data.data;
        };

        try {
            // ---------- prices (public) ----------
            const pxRes = await axios.get('https://open-api.bingx.com/openApi/spot/v1/ticker/24hr');
            const raw = pxRes.data?.data || [];
            const priceMap = new Map(
                (Array.isArray(raw) ? raw : []).map(t => [
                    String((t.symbol || t.s || '').replace('-', '')).toUpperCase(),  // e.g. BTCUSDT
                    parseFloat(t.lastPrice || t.c || '0')
                ])
            );
            const getUsdtValue = (asset, amount) => {
                const a = String(asset || '').toUpperCase();
                const amt = Number(amount || 0);
                if (!Number.isFinite(amt) || amt <= 0) return 0;
                if (a === 'USDT') return amt;
                const p = priceMap.get(`${a}USDT`);
                return p ? amt * p : 0;
            };

            const result = [];

            /* ---------- SPOT ---------- */
            const spotData = await sendRequest('/openApi/spot/v1/account/balance');
            const spotBalances = Array.isArray(spotData?.balances) ? spotData.balances : [];

            const spotBalancesEnriched = spotBalances.map(b => {
                const asset  = (b.asset || '').toUpperCase();
                const free   = parseFloat(b.free || 0);
                const locked = parseFloat(b.locked || 0);
                const amount = free + locked;
                const value  = getUsdtValue(asset, amount);
                return { asset, free, locked, amount, value };
            });

            const spotTotal = spotBalancesEnriched.reduce((s, a) => s + a.value, 0);

            result.push({
                accountType: 'Spot',
                value: Number(spotTotal.toFixed(8)),
                balances: spotBalancesEnriched,
                children: spotBalancesEnriched
                    .filter(a => a.value > 0.01)
                    .map(a => ({ name: a.asset, value: Number(a.value.toFixed(8)) }))
                    .sort((a, b) => b.value - a.value)
            });

            /* ---------- FUTURES: USDT-M ---------- */
            const futBal = await sendRequest('/openApi/swap/v2/user/balance');
            const futPos = await sendRequest('/openApi/swap/v2/user/positions');

            const walletBalance =
                parseFloat(
                    (futBal?.balance && (futBal.balance.balance ?? futBal.balance.availableBalance ?? futBal.balance.walletBalance)) ??
                    futBal?.walletBalance ??
                    futBal?.availableBalance ??
                    0
                ) || 0;

            const futPositions = (Array.isArray(futPos) ? futPos : [])
                .map(p => ({
                    symbol: p.symbol,
                    side: String(p.positionSide || p.side || 'BOTH').toUpperCase(),
                    size: parseFloat(p.positionAmt || p.qty || 0),
                    leverage: parseFloat(p.leverage || 0),
                    marginType: String(p.marginType || 'UNKNOWN').toUpperCase(),
                    entryPrice: parseFloat(p.entryPrice || 0),
                    markPrice: parseFloat(p.markPrice || 0),
                    liqPrice: parseFloat(p.liquidationPrice || 0),
                    notional: parseFloat(p.positionValue || p.notional || 0),
                    unrealizedPnl: parseFloat(p.unrealizedPnl || p.uPnl || 0),
                }))
                .filter(p => Math.abs(p.notional) > 0.01 || Math.abs(p.unrealizedPnl) > 0.01);

            const totalUnrealizedPnl = futPositions.reduce((s, p) => s + (p.unrealizedPnl || 0), 0);
            const futuresValue = walletBalance + totalUnrealizedPnl;

            result.push({
                accountType: 'Futures',
                subType: 'USDT-M',
                walletBalance: Number(walletBalance.toFixed(8)),
                totalUnrealizedPnl: Number(totalUnrealizedPnl.toFixed(8)),
                positions: futPositions,
                value: Number(futuresValue.toFixed(8)),
                children: [
                    ...(walletBalance > 0 ? [{ name: 'Wallet', value: Number(walletBalance.toFixed(8)) }] : []),
                    ...futPositions
                        .map(p => ({ name: p.symbol, value: Math.abs(p.notional || 0) }))
                        .filter(x => x.value > 0.01)
                ].sort((a, b) => b.value - a.value)
            });

            /* ---------- FUTURES: COIN-M (socket-fed) ---------- */
            // Provide setters below to keep this cache fresh from your COIN-M socket consumer.
            const coinMWallet = Number(this.coinMWalletValue || 0);
            const coinMUPnL   = Number(this.coinMTotalUPnL || 0);
            const coinMValue  = coinMWallet + coinMUPnL;
            const coinMChildren = Array.isArray(this.coinMChildren) ? this.coinMChildren : [];

            result.push({
                accountType: 'Futures',
                subType: 'COIN-M',
                walletBalance: Number(coinMWallet.toFixed(8)),
                totalUnrealizedPnl: Number(coinMUPnL.toFixed(8)),
                positions: [], // if you store them, map here
                value: Number(coinMValue.toFixed(8)),
                children: coinMChildren
            });

            /* ---------- FUND / COMMON ---------- */
            // Docs: /en-us/common/account-api.html#Query%20Assets
            // Common path:
            let fundNode = { accountType: 'Funding', value: 0, balances: [], children: [] };
            try {
                const commonData = await sendRequest('/openApi/common/v1/account/assets');
                const assets = Array.isArray(commonData?.balances || commonData?.assets)
                    ? (commonData.balances || commonData.assets)
                    : [];

                const fundBalances = assets.map(a => {
                    const asset = (a.asset || a.ccy || '').toUpperCase();
                    const amt = parseFloat(a.free || a.balance || a.amount || 0);
                    const value = getUsdtValue(asset, amt);
                    return { asset, free: amt, locked: 0, amount: amt, value };
                });

                const fundTotal = fundBalances.reduce((s, x) => s + x.value, 0);

                fundNode = {
                    accountType: 'Funding',
                    value: Number(fundTotal.toFixed(8)),
                    balances: fundBalances,
                    children: fundBalances
                        .filter(x => x.value > 0.01)
                        .map(x => ({ name: x.asset, value: Number(x.value.toFixed(8)) }))
                        .sort((a, b) => b.value - a.value)
                };
            } catch (e) {
                // often permission/empty; keep zero node for explicitness
            }
            result.push(fundNode);

            return result;
        } catch (err) {
            console.error('[BingXWS] getDetailedBalance error:', err.message);
            return [];
        }
    }

    /* -------------------------- History/PnL helpers (unchanged signatures) -------------------------- */

    async getHistoricalBalance(account, date) {
        console.log(`[BingXWS] NOTE: getHistoricalBalance not supported by BingX. Returning 0 for ${date.toISOString().slice(0,10)}.`);
        return 0;
    }

    async getHistoricalRealizedPnL(account, { days }) {
        const { apiKey, secretKey } = account;
        const endTime = Date.now();
        const startTime = endTime - (days * 24 * 60 * 60 * 1000);

        const params = {
            incomeType: 'REALIZED_PNL',
            startTime, endTime,
            limit: 1000,
            timestamp: Date.now().toString()
        };

        const queryString = new URLSearchParams(params).toString();
        const signature = crypto.createHmac('sha256', secretKey).update(queryString).digest('hex');
        const url = `https://open-api.bingx.com/openApi/swap/v2/user/income?${queryString}&signature=${signature}`;

        try {
            const res = await fetch(url, { headers: { 'X-BX-APIKEY': apiKey } });
            const json = await res.json();
            if (json.code !== 0) throw new Error(`BingX Realized PnL Error: ${json.msg || json.message}`);

            const incomeRecords = Array.isArray(json.data?.income) ? json.data.income : [];
            const dailyGroups = {};
            for (const r of incomeRecords) {
                const dateKey = new Date(parseInt(r.time, 10)).toISOString().slice(0, 10);
                const pnl = parseFloat(r.income || 0);
                dailyGroups[dateKey] = (dailyGroups[dateKey] || 0) + pnl;
            }

            return Object.entries(dailyGroups).map(([date, profit]) => ({
                timestamp: new Date(`${date}T00:00:00Z`).getTime(),
                profit
            }));
        } catch (err) {
            console.error('[BingXWS] getHistoricalRealizedPnL Error:', err.message);
            return [];
        }
    }

    async getUnrealizedPnLHistory(account, { days }) {
        const { apiKey, secretKey } = account;
        const ts = Date.now().toString();
        const qs = `timestamp=${ts}`;
        const sig = crypto.createHmac('sha256', secretKey).update(qs).digest('hex');
        const url = `https://open-api.bingx.com/openApi/swap/v2/user/positions?${qs}&signature=${sig}`;

        try {
            const res = await fetch(url, { headers: { 'X-BX-APIKEY': apiKey } });
            const json = await res.json();
            if (json.code !== 0) throw new Error(`BingX error: ${json.msg || json.message}`);

            const positions = Array.isArray(json.data) ? json.data : [];
            return positions.map(pos => {
                const unrealizedPnl = parseFloat(pos.unrealizedPnl || 0);
                const initialMargin = parseFloat(pos.initialMargin || 0);
                const pnlPercentage = initialMargin > 0 ? (unrealizedPnl / initialMargin) * 100 : 0;

                return {
                    symbol: pos.symbol,
                    leverage: pos.leverage,
                    unrealizedPnl: unrealizedPnl.toFixed(2),
                    pct: parseFloat(pnlPercentage.toFixed(2)),
                    timestamp: parseInt(pos.positionTimestamp, 10) || Date.now(),
                };
            });
        } catch (err) {
            console.error('[BingXWS] getUnrealizedPnLHistory Error:', err.message);
            return [];
        }
    }

    /* -------------------------- COIN-M socket cache setters -------------------------- */

    /**
     * Call this from your COIN-M socket consumer whenever you receive an update.
     * @param {{ walletUSDT?: number, upnlUSDT?: number, children?: Array<{name:string,value:number}> }} payload
     */
    setCoinMAccountSnapshotFromSocket(payload = {}) {
        const { walletUSDT = 0, upnlUSDT = 0, children = [] } = payload;
        this.coinMWalletValue = Number(walletUSDT || 0);
        this.coinMTotalUPnL   = Number(upnlUSDT || 0);
        this.coinMChildren    = Array.isArray(children) ? children : [];
    }
}

module.exports = new BingXWS();
