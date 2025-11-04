// app/services/bingxWS.js
const WebSocket = require('ws');
const crypto    = require('crypto');
const zlib      = require('zlib');
const axios     = require('axios');
const Candle    = require('../models/Candle');

class BingXWS {
    constructor() {
        // ---- public market WS (klines/tickers) ----
        this.ws = null;
        this.reconnectInterval = 5000;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.subscriptions = new Map();
        this.pingInterval = null;

        // ---- COIN-M private WS (account/position) ----
        this.coinMWS = null;
        this.coinMConnected = false;
        this._coinMRetryTimer = null;
        this.coinMReconnectMs = 5000;

        // in-memory COIN-M cache (USDT-valued)
        this.coinMWalletValue = 0;  // wallet collateral (valued in USDT)
        this.coinMTotalUPnL   = 0;  // total uPnL (USDT)
        this.coinMChildren    = []; // e.g. [{ name:'BTC', value: 28.97 }, ...]
    }

    /* ========================= Public market WS ========================= */

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
            console.log('[BingXWS] Connected to public WS');
            this.reconnectAttempts = 0;
            this.subscriptions.forEach((sub) => this.sendSubscription(sub.symbol, sub.interval));
        });

        this.ws.on('message', async (data, isBinary) => {
            try {
                const msg = isBinary ? this.parseBinaryMessage(data) : JSON.parse(data.toString());
                if (!msg) return;
                if (msg.ping) { this.handlePing(msg.ping); return; }
                if (msg.event === 'login') { this.handleAuthResponse(msg); return; }
                await this.processMessage(msg);
            } catch (e) {
                console.error('[BingXWS] public message error:', e.message);
            }
        });

        this.ws.on('error', (err) => {
            console.error('[BingXWS] Public WS error:', err.message);
            this.cleanup();
        });

        this.ws.on('close', (code, reason) => {
            console.warn(`[BingXWS] Public WS closed: ${code} ${reason || ''}`);
            this.cleanup();
            this.handleReconnect();
        });
    }

    handleAuthResponse(message) {
        if (message.code === 0) console.log('[BingXWS] Authentication successful');
        else {
            console.error('[BingXWS] Authentication failed:', message);
            this.cleanup();
            throw new Error('BingX public WS auth failed');
        }
    }

    handlePing(ts) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ pong: ts }));
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
        setTimeout(() => {
            this.reconnectAttempts++;
            this.connect();
        }, delay);
    }

    async processMessage(msg) {
        if (!msg || typeof msg !== 'object') return;
        if (msg.topic && msg.topic.includes('kline')) return this.processKlineMessage(msg);
        if (msg.topic && msg.topic.includes('ticker')) return this.processTickerMessage(msg);
    }

    async processKlineMessage(msg) {
        const k = msg.data;
        if (!k) return;
        const [symbol, interval] = msg.topic.split('@');
        const c = {
            symbol: symbol.toUpperCase(),
            timeframe: this.mapInterval(interval.replace('kline_', '')),
            timestamp: k.t,
            open: +k.o, high: +k.h, low: +k.l, close: +k.c,
            volume: +k.v, trades: parseInt(k.n, 10), isClosed: k.x
        };
        const ok = ['open','high','low','close','volume'].every(x => Number.isFinite(c[x]));
        if (!ok) return;
        await Candle.findOneAndUpdate(
            { symbol: c.symbol, timeframe: c.timeframe, timestamp: c.timestamp },
            { $set: { open:c.open, high:c.high, low:c.low, close:c.close, volume:c.volume, trades:c.trades, isClosed:c.isClosed }},
            { upsert: true, new: true }
        );
    }

    async processTickerMessage(_msg) { /* no-op */ }

    mapInterval(i) {
        const m = { '1m':'1m','3m':'3m','5m':'5m','15m':'15m','30m':'30m','1h':'1h','2h':'2h','4h':'4h','6h':'6h','8h':'8h','12h':'12h','1d':'1d','3d':'3d','1w':'1w','1M':'1M' };
        return m[i] || i;
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
        if (!this.subscriptions.has(key)) return;
        const msg = { id: Date.now(), reqType: 'unsub', dataType: `${symbol.toLowerCase()}@kline_${interval}` };
        this.sendWhenReady(msg);
        this.subscriptions.delete(key);
    }

    sendSubscription(symbol, interval) {
        const msg = { id: Date.now(), reqType: 'sub', dataType: `${symbol.toLowerCase()}@kline_${interval}` };
        this.sendWhenReady(msg);
    }

    sendWhenReady(message) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            try { this.ws.send(JSON.stringify(message)); }
            catch (e) { console.error('[BingXWS] send error:', e.message); this.handleReconnect(); }
        } else {
            setTimeout(() => this.sendWhenReady(message), 100);
        }
    }

    disconnect() {
        if (this.ws) { this.cleanup(); try { this.ws.close(); } catch {} }
        if (this.coinMWS) { try { this.coinMWS.close(); } catch {} this.coinMWS = null; this.coinMConnected = false; }
        if (this._coinMRetryTimer) { clearTimeout(this._coinMRetryTimer); this._coinMRetryTimer = null; }
    }

    parseBinaryMessage(data) {
        const raw = data.toString();
        if (['Ping','PING','pong'].includes(raw)) return { ping: Date.now() };
        try {
            const txt = zlib.gunzipSync(data).toString();
            const f = txt.trim()[0];
            if (f === '{' || f === '[') return JSON.parse(txt);
            return { ping: txt };
        } catch (_) { return null; }
    }

    /* ============================ Simple balances ============================ */

    async getSpotBalance(account) {
        const { apiKey, secretKey } = account;
        const ts = Date.now().toString();
        const path = '/openApi/spot/v1/account/balance';

        const qs  = new URLSearchParams({ timestamp: ts }).toString();
        const sig = crypto.createHmac('sha256', secretKey).update(qs).digest('hex');
        const url = `https://open-api.bingx.com${path}?${qs}&signature=${sig}`;

        const resp = await axios.get(url, { headers: { 'X-BX-APIKEY': apiKey } });
        if (resp.data?.code !== 0) throw new Error(`Spot Balance Error: ${resp.data?.msg}`);
        const usdt = resp.data.data?.balances?.find(b => b.asset === 'USDT');
        return usdt ? parseFloat(usdt.free) : 0;
    }

    async getFuturesBalance(account) {
        const { apiKey, secretKey } = account;
        const ts = Date.now().toString();
        const path = '/openApi/swap/v2/user/balance';

        const qs  = new URLSearchParams({ timestamp: ts }).toString();
        const sig = crypto.createHmac('sha256', secretKey).update(qs).digest('hex');
        const url = `https://open-api.bingx.com${path}?${qs}&signature=${sig}`;

        const resp = await axios.get(url, { headers: { 'X-BX-APIKEY': apiKey } });
        if (resp.data?.code !== 0) throw new Error(`Futures Balance Error: ${resp.data?.msg}`);

        const wallet =
            parseFloat(
                (resp.data.data?.balance && (resp.data.data.balance.balance ??
                    resp.data.data.balance.availableBalance ??
                    resp.data.data.balance.walletBalance)) ??
                resp.data.data?.walletBalance ??
                resp.data.data?.availableBalance ??
                0
            ) || 0;

        return wallet;
    }

    /**
     * Keeps ORIGINAL shape:
     *  - all=false -> number (spot free USDT)
     *  - all=true  -> [{accountType:'spot',...}, {accountType:'futures',...}]
     */
    async getBalance(account, { all = false, accountType = '' } = {}) {
        try {
            if (all) {
                const [spot, fut] = await Promise.all([this.getSpotBalance(account), this.getFuturesBalance(account)]);
                return [
                    { accountType: 'spot',    usdtBalance: spot.toString() },
                    { accountType: 'futures', usdtBalance: fut.toString()   },
                ];
            }
            if (accountType === 'futures') {
                const fut = await this.getFuturesBalance(account);
                return [{ accountType: 'futures', usdtBalance: fut.toString() }];
            }
            const spot = await this.getSpotBalance(account);
            return spot;
        } catch (e) {
            console.error('[BingXWS] getBalance error:', e.message);
            return all ? [{ accountType: 'error', usdtBalance: '0' }] : 0;
        }
    }

    /* ======================= Detailed valued balances ======================= */

    async getDetailedBalance(account) {
        const { apiKey, secretKey } = account;

        const signedGet = async (path, params = {}) => {
            const timestamp = Date.now();
            const qs = new URLSearchParams({ ...params, timestamp }).toString();
            const sig = crypto.createHmac('sha256', secretKey).update(qs).digest('hex');
            const url = `https://open-api.bingx.com${path}?${qs}&signature=${sig}`;
            const resp = await axios.get(url, { headers: { 'X-BX-APIKEY': apiKey } });
            if (resp.data?.code !== 0) throw new Error(`BingX API error (${path}): ${resp.data?.msg || 'unknown'}`);
            return resp.data.data;
        };

        try {
            // prices (for asset->USDT conversion)
            const pxRes = await axios.get('https://open-api.bingx.com/openApi/spot/v1/ticker/24hr');
            const rawTick = pxRes.data?.data || [];
            const priceMap = new Map(
                (Array.isArray(rawTick) ? rawTick : []).map(t => [
                    String((t.symbol || t.s || '').replace('-', '')).toUpperCase(),
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

            // ---- SPOT
            const spotData = await signedGet('/openApi/spot/v1/account/balance');
            const spotBalances = Array.isArray(spotData?.balances) ? spotData.balances : [];
            const spotRows = spotBalances.map(b => {
                const asset = (b.asset || '').toUpperCase();
                const free = +b.free || 0, locked = +b.locked || 0;
                const amount = free + locked;
                const value = getUsdtValue(asset, amount);
                return { asset, free, locked, amount, value };
            });
            const spotTotal = spotRows.reduce((s, r) => s + r.value, 0);
            result.push({
                accountType: 'Spot',
                value: +spotTotal.toFixed(8),
                balances: spotRows,
                children: spotRows.filter(x => x.value > 0.01).map(x => ({ name: x.asset, value: +x.value.toFixed(8) }))
                    .sort((a,b) => b.value - a.value)
            });

            // ---- USDT-M FUTURES (wallet + uPnL + positions)
            const futBal = await signedGet('/openApi/swap/v2/user/balance');
            const futPos = await signedGet('/openApi/swap/v2/user/positions');

            const walletBalance =
                parseFloat(
                    (futBal?.balance && (futBal.balance.balance ??
                        futBal.balance.availableBalance ??
                        futBal.balance.walletBalance)) ??
                    futBal?.walletBalance ??
                    futBal?.availableBalance ??
                    0
                ) || 0;

            const positions = (Array.isArray(futPos) ? futPos : [])
                .map(p => ({
                    symbol: p.symbol,
                    side: String(p.positionSide || p.side || 'BOTH').toUpperCase(),
                    size: +p.positionAmt || +p.qty || 0,
                    leverage: +p.leverage || 0,
                    marginType: String(p.marginType || 'UNKNOWN').toUpperCase(),
                    entryPrice: +p.entryPrice || 0,
                    markPrice: +p.markPrice || 0,
                    liqPrice: +p.liquidationPrice || 0,
                    notional: +p.positionValue || +p.notional || 0,
                    unrealizedPnl: +p.unrealizedPnl || +p.uPnl || 0,
                }))
                .filter(p => Math.abs(p.notional) > 0.01 || Math.abs(p.unrealizedPnl) > 0.01);

            const upnl = positions.reduce((s, p) => s + (p.unrealizedPnl || 0), 0);
            const futValue = walletBalance + upnl;

            result.push({
                accountType: 'Futures',
                subType: 'USDT-M',
                walletBalance: +walletBalance.toFixed(8),
                totalUnrealizedPnl: +upnl.toFixed(8),
                positions,
                value: +futValue.toFixed(8),
                children: [
                    ...(walletBalance > 0 ? [{ name: 'Wallet', value: +walletBalance.toFixed(8) }] : []),
                    ...positions.map(p => ({ name: p.symbol, value: Math.abs(p.notional || 0) }))
                        .filter(x => x.value > 0.01)
                ].sort((a,b) => b.value - a.value)
            });

            // ---- COIN-M FUTURES (from private socket cache; doc url uses /market)
            const coinMWallet = Number(this.coinMWalletValue || 0);
            const coinMUPnL   = Number(this.coinMTotalUPnL || 0);
            const coinMVal    = coinMWallet + coinMUPnL;
            const coinMChildren = Array.isArray(this.coinMChildren) ? this.coinMChildren : [];
            result.push({
                accountType: 'Futures',
                subType: 'COIN-M',
                walletBalance: +coinMWallet.toFixed(8),
                totalUnrealizedPnl: +coinMUPnL.toFixed(8),
                positions: [],
                value: +coinMVal.toFixed(8),
                children: coinMChildren
            });

            // ---- FUND / COMMON (Funding)
            let fundNode = { accountType: 'Funding', value: 0, balances: [], children: [] };
            try {
                const commonData = await signedGet('/openApi/common/v1/account/assets');
                console.log('8790127309790175', commonData)
                const arr = Array.isArray(commonData?.balances || commonData?.assets)
                    ? (commonData.balances || commonData.assets)
                    : [];
                const rows = arr.map(a => {
                    const asset = (a.asset || a.ccy || '').toUpperCase();
                    const amt = +(a.free || a.balance || a.amount || 0);
                    const value = getUsdtValue(asset, amt);
                    return { asset, free: amt, locked: 0, amount: amt, value };
                });
                const total = rows.reduce((s, r) => s + r.value, 0);
                fundNode = {
                    accountType: 'Funding',
                    value: +total.toFixed(8),
                    balances: rows,
                    children: rows.filter(x => x.value > 0.01).map(x => ({ name: x.asset, value: +x.value.toFixed(8) }))
                        .sort((a,b) => b.value - a.value)
                };
            } catch (_) { /* ignore if no fund assets */ }
            result.push(fundNode);

            return result;
        } catch (e) {
            console.error('[BingXWS] getDetailedBalance error:', e.message);
            return [];
        }
    }

    /* =================== Historical / PnL helpers (same) =================== */

    async getHistoricalBalance(_account, date) {
        console.log(`[BingXWS] getHistoricalBalance not supported by BingX. Returning 0 for ${date.toISOString().slice(0,10)}.`);
        return 0;
    }

    async getHistoricalRealizedPnL(account, { days }) {
        const { apiKey, secretKey } = account;
        const endTime = Date.now();
        const startTime = endTime - (days * 86400000);

        const params = { incomeType: 'REALIZED_PNL', startTime, endTime, limit: 1000, timestamp: Date.now().toString() };
        const qs  = new URLSearchParams(params).toString();
        const sig = crypto.createHmac('sha256', secretKey).update(qs).digest('hex');
        const url = `https://open-api.bingx.com/openApi/swap/v2/user/income?${qs}&signature=${sig}`;

        try {
            const res = await fetch(url, { headers: { 'X-BX-APIKEY': apiKey } });
            const json = await res.json();
            if (json.code !== 0) throw new Error(json.msg || json.message);

            const income = Array.isArray(json.data?.income) ? json.data.income : [];
            const map = {};
            for (const r of income) {
                const day = new Date(+r.time).toISOString().slice(0,10);
                const v = parseFloat(r.income || 0);
                map[day] = (map[day] || 0) + v;
            }
            return Object.entries(map).map(([d, profit]) => ({
                timestamp: new Date(`${d}T00:00:00Z`).getTime(),
                profit
            }));
        } catch (e) {
            console.error('[BingXWS] getHistoricalRealizedPnL error:', e.message);
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
            if (json.code !== 0) throw new Error(json.msg || json.message);

            const positions = Array.isArray(json.data) ? json.data : [];
            return positions.map(pos => {
                const u = +pos.unrealizedPnl || 0;
                const im = +pos.initialMargin || 0;
                const pct = im > 0 ? (u / im) * 100 : 0;
                return {
                    symbol: pos.symbol,
                    leverage: pos.leverage,
                    unrealizedPnl: u.toFixed(2),
                    pct: +pct.toFixed(2),
                    timestamp: parseInt(pos.positionTimestamp, 10) || Date.now(),
                };
            });
        } catch (e) {
            console.error('[BingXWS] getUnrealizedPnLHistory error:', e.message);
            return [];
        }
    }

    /* ======================= COIN-M private WS (merged) ======================= */

    /**
     * Connect to COIN-M private socket (account & position pushes).
     * Doc endpoint: wss://open-api-cswap-ws.bingx.com/market
     * @param {{ apiKey:string, secretKey:string }} account
     */
    connectCoinMPrivate(account) {
        if (this.coinMWS && this.coinMConnected) return;

        const { apiKey, secretKey } = account;
        const url = 'wss://open-api-cswap-ws.bingx.com/market';

        const onOpen = () => {
            console.log('[BingXWS] COIN-M WS connected');
            this.coinMConnected = true;

            // Login
            const ts  = Date.now().toString();
            const sig = crypto.createHmac('sha256', secretKey).update(`timestamp=${ts}`).digest('hex');
            const login = { event: 'login', params: { apiKey, timestamp: ts, signature: sig } };
            this.coinMWS.send(JSON.stringify(login));

            // Subscribe to account & position updates
            // The docs show an “account balance and position update push” channel.
            // We support both topic styles commonly seen.
            setTimeout(() => {
                try {
                    this.coinMWS.send(JSON.stringify({ event: 'sub', topic: 'account' }));
                    this.coinMWS.send(JSON.stringify({ event: 'sub', topic: 'position' }));
                } catch {
                    try { this.coinMWS.send(JSON.stringify({ reqType: 'sub', dataType: 'account' })); } catch {}
                    try { this.coinMWS.send(JSON.stringify({ reqType: 'sub', dataType: 'position' })); } catch {}
                }
            }, 150);
        };

        const onMessage = (raw) => {
            try {
                const msg = JSON.parse(raw.toString());

                // pong/keepalive
                if (msg?.ping) {
                    this.coinMWS.send(JSON.stringify({ pong: msg.ping }));
                    return;
                }

                // login ack
                if (msg?.event === 'login') {
                    if (msg.code === 0) console.log('[BingXWS] COIN-M login ok');
                    else console.error('[BingXWS] COIN-M login failed:', msg);
                    return;
                }

                // account update
                if (msg?.topic === 'account' || msg?.type === 'ACCOUNT_UPDATE') {
                    this._applyCoinMAccountPayload(msg.data);
                    return;
                }

                // position update
                if (msg?.topic === 'position' || msg?.type === 'POSITION_UPDATE') {
                    this._applyCoinMPositionPayload(msg.data);
                    return;
                }

                // combined payload
                if (msg?.data && (msg.data.balances || msg.data.positions)) {
                    this._applyCoinMAccountPayload(msg.data);
                    this._applyCoinMPositionPayload(msg.data);
                }
            } catch (_) { /* ignore parse errors */ }
        };

        const onError = (err) => {
            console.error('[BingXWS] COIN-M WS error:', err.message);
        };

        const onClose = () => {
            console.warn('[BingXWS] COIN-M WS closed');
            this.coinMConnected = false;
            this.coinMWS = null;
            if (this._coinMRetryTimer) clearTimeout(this._coinMRetryTimer);
            this._coinMRetryTimer = setTimeout(() => this.connectCoinMPrivate(account), this.coinMReconnectMs);
        };

        this.coinMWS = new WebSocket(url);
        this.coinMWS.on('open', onOpen);
        this.coinMWS.on('message', onMessage);
        this.coinMWS.on('error', onError);
        this.coinMWS.on('close', onClose);
    }

    _applyCoinMAccountPayload(data = {}) {
        try {
            // prefer USDT-valued fields if available
            const walletUSDT =
                Number(data.walletBalanceUSDT ?? data.walletBalance ?? 0) || 0;
            const upnlUSDT =
                Number(data.totalUnrealizedPnlUSDT ?? data.uPnl ?? 0) || 0;

            if (Number.isFinite(walletUSDT)) this.coinMWalletValue = walletUSDT;
            if (Number.isFinite(upnlUSDT))   this.coinMTotalUPnL   = upnlUSDT;

            // optional leaves from balances: if server provides per-coin valueUSDT/notionalUSDT
            if (Array.isArray(data.balances)) {
                const leaves = [];
                for (const b of data.balances) {
                    const sym = String(b.asset || b.ccy || b.symbol || '').toUpperCase();
                    const val = Number(b.notionalUSDT || b.valueUSDT || 0);
                    if (sym && val > 0.01) leaves.push({ name: sym, value: val });
                }
                if (leaves.length) this.coinMChildren = leaves;
            }
        } catch (_) {}
    }

    _applyCoinMPositionPayload(data = {}) {
        try {
            const positions = Array.isArray(data.positions) ? data.positions : [];
            const leaves = positions
                .map(p => ({
                    name: String(p.symbol || p.instId || '').toUpperCase(),
                    value: Math.abs(Number(p.notionalUSDT || p.notionalUsd || p.notional || 0))
                }))
                .filter(x => x.name && x.value > 0.01);

            if (leaves.length) this.coinMChildren = leaves;
        } catch (_) {}
    }

    // exposed setter (if you ever want to push values manually)
    setCoinMAccountSnapshotFromSocket({ walletUSDT = 0, upnlUSDT = 0, children = [] } = {}) {
        this.coinMWalletValue = Number(walletUSDT || 0);
        this.coinMTotalUPnL   = Number(upnlUSDT || 0);
        this.coinMChildren    = Array.isArray(children) ? children : [];
    }
}

module.exports = new BingXWS();
