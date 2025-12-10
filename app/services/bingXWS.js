const WebSocket = require('ws');
const crypto = require('crypto');
const zlib = require('zlib');
const Candle = require('../models/Candle');
const axios = require("axios");

class BingXWS {
    constructor() {
        this.ws = null;
        this.reconnectInterval = 5000;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.subscriptions = new Map();
        this.pingInterval = null;
    }

    /**
     * Generates a signature using the provided apiSecret.
     */
    generateSignature(timestamp, apiSecret) {
        const signString = `timestamp=${timestamp}`;
        return crypto
            .createHmac('sha256', apiSecret)
            .update(signString)
            .digest('hex');
    }

    connect() {
        if (this.ws) return;

        const endpoint = `wss://open-api-swap.bingx.com/swap-market`;
        this.ws = new WebSocket(endpoint, {
            perMessageDeflate: false
        });
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
                if (isBinary) {
                    message = this.parseBinaryMessage(data);
                } else {
                    message = JSON.parse(data.toString());
                }

                if (!message) return;

                if (message.ping) {
                    this.handlePing(message.ping);
                    return;
                }

                if (message.event === 'login') {
                    this.handleAuthResponse(message);
                    return;
                }

                await this.processMessage(message);
            } catch (error) {
                console.error('[BingXWS] Message processing error:', error);
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
            params: {
                apiKey: apiKey,
                timestamp: timestamp,
                signature: signature
            }
        };
        this.sendWhenReady(authMessage);
    }

    handleAuthResponse(message) {
        if (message.code === 0) {
            console.log('[BingXWS] Authentication successful');
        } else {
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
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        if (this.ws) {
            this.ws.removeAllListeners();
            this.ws = null;
        }
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
        } catch (error) {
            console.error('[BingXWS] Message processing failed:', error);
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

        const isValid = ['open', 'high', 'low', 'close', 'volume']
            .every(key => Number.isFinite(candleData[key]));

        if (isValid) {
            await this.upsertCandle(candleData);
        } else {
            console.warn('[BingXWS] Invalid candle data:', candleData);
        }
    }

    async processTickerMessage(msg) {
        console.log('[BingXWS] Ticker update:', msg);
    }

    mapInterval(interval) {
        const mapping = {
            '1m': '1m', '3m': '3m', '5m': '5m', '15m': '15m', '30m': '30m',
            '1h': '1h', '2h': '2h', '4h': '4h', '6h': '6h', '8h': '8h',
            '12h': '12h', '1d': '1d', '3d': '3d', '1w': '1w', '1M': '1M'
        };
        return mapping[interval] || interval;
    }

    async upsertCandle(candleData) {
        try {
            await Candle.findOneAndUpdate(
                {
                    symbol: candleData.symbol,
                    timeframe: candleData.timeframe,
                    timestamp: candleData.timestamp
                },
                {
                    $set: {
                        open: candleData.open,
                        high: candleData.high,
                        low: candleData.low,
                        close: candleData.close,
                        volume: candleData.volume,
                        trades: candleData.trades,
                        isClosed: candleData.isClosed
                    }
                },
                { upsert: true, new: true }
            );
        } catch (err) {
            console.error('[BingXWS] Candle upsert failed:', err);
            throw err;
        }
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
            const unsubscribeMsg = {
                id: Date.now(),
                reqType: "unsub",
                dataType: `${symbol.toLowerCase()}@kline_${interval}`
            };
            this.sendWhenReady(unsubscribeMsg);
            this.subscriptions.delete(key);
        }
    }

    sendSubscription(symbol, interval) {
        const subscribeMsg = {
            id: Date.now(),
            reqType: "sub",
            dataType: `${symbol.toLowerCase()}@kline_${interval}`
        };
        this.sendWhenReady(subscribeMsg);
    }

    sendWhenReady(message) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            try {
                this.ws.send(JSON.stringify(message));
            } catch (error) {
                console.error('[BingXWS] Send error:', error);
                this.handleReconnect();
            }
        } else {
            setTimeout(() => this.sendWhenReady(message), 100);
        }
    }

    disconnect() {
        if (this.ws) {
            this.cleanup();
            this.ws.close();
        }
    }

    isConnected() {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    getSubscriptions() {
        return Array.from(this.subscriptions.values());
    }

    parseBinaryMessage(data) {
        const raw = data.toString();
        if (raw === 'Ping' || raw === 'pong' || raw === 'PING') {
            return { ping: Date.now() };
        }
        try {
            const decompressed = zlib.gunzipSync(data);
            const text = decompressed.toString();
            const first = text.trim()[0];
            if (first === '{' || first === '[') {
                return JSON.parse(text);
            } else {
                return { ping: text };
            }
        } catch (err) {
            console.debug('[BingXWS] parseBinaryMessage non-gzip or invalid JSON:', err.message);
            return null;
        }
    }

    // =========================================================================
    // UPDATED BALANCE LOGIC START
    // =========================================================================

    /**
     * Helper to get current Spot prices for USDT conversion.
     */
    async getSpotPrices() {
        try {
            const url = 'https://open-api.bingx.com/openApi/spot/v1/ticker/price';
            const res = await axios.get(url);
            const map = new Map();
            if (res.data && Array.isArray(res.data.data)) {
                res.data.data.forEach(item => {
                    // Item usually { symbol: "BTC-USDT", price: "60000.00" }
                    // Store as "BTC-USDT" -> 60000.00
                    map.set(item.symbol, parseFloat(item.price));
                });
            }
            return map;
        } catch (e) {
            console.warn('[BingXWS] Failed to fetch spot prices:', e.message);
            return new Map();
        }
    }

    /**
     * Fetches raw Spot balances (array).
     */
    async getSpotBalanceRaw(account) {

        const { apiKey, secretKey } = account;
        const timestamp = Date.now().toString();
        const base = 'https://open-api.bingx.com';
        const path = '/openApi/fund/v1/account/balance';

        const queryParams = new URLSearchParams({ timestamp });
        const toSign = queryParams.toString();
        const signature = crypto.createHmac('sha256', secretKey).update(toSign).digest('hex');
        queryParams.append('signature', signature);
        const url = `${base}${path}?${queryParams.toString()}`;

        try {
            const resp = await axios.get(url, { headers: { "X-BX-APIKEY": apiKey } });

            if (resp.data.code !== 0) {
                console.error(`BingX Spot Error: ${resp.data.msg}`);
                return [];
            }
            // Returns array of { asset, free, locked }
            return resp.data.data.balances || [];
        } catch (err) {
            console.error('[BingXWS] getSpotBalanceRaw Error:', err.message);
            return [];
        }
    }

    /**
     * Fetches raw Futures user balance data.
     */
    async getFuturesBalanceRaw(account) {
        const { apiKey, secretKey } = account;
        const timestamp = Date.now().toString();
        const base = 'https://open-api.bingx.com';
        const path = '/openApi/swap/v2/user/balance';

        const queryParams = new URLSearchParams({ timestamp });
        const toSign = queryParams.toString();
        const signature = crypto.createHmac('sha256', secretKey).update(toSign).digest('hex');
        queryParams.append('signature', signature);
        const url = `${base}${path}?${queryParams.toString()}`;

        try {
            const resp = await axios.get(url, { headers: { 'X-BX-APIKEY': apiKey } });
            if (resp.data.code !== 0) {
                console.error(`BingX Futures Error: ${resp.data.msg}`);
                return null;
            }
            // Usually returns { balance: { equity: "...", availableMargin: "..." } }
            // Or sometimes data.balance is the object directly.
            return resp.data.data.balance || null;
        } catch (err) {
            console.error('[BingXWS] getFuturesBalanceRaw Error:', err.message);
            return null;
        }
    }

    /**
     * Main getBalance function.
     * Fetches Spot + Fund + Futures (USDT-M) + Futures (Coin-M).
     * Returns an array of objects compatible with accountController.
     */
    async getBalance(account, { all = false, accountType = '' } = {}) {
        const balances = [];
        const { apiKey, secretKey } = account;

        try {
            // 1. Fetch Prices (Needed for Spot, Fund, and Coin-M conversion)
            // We use the 24hr ticker because it is often more reliable for symbol formatting consistency
            let priceMap = new Map();
            try {
                const pxRes = await axios.get('https://open-api.bingx.com/openApi/spot/v1/ticker/24hr');
                const raw = pxRes.data?.data || [];
                // Map: "BTC" -> Price (Derived from BTC-USDT)
                raw.forEach(t => {
                    const symbol = t.symbol || t.s; // e.g. "BTC-USDT"
                    const price = parseFloat(t.lastPrice || t.c || 0);
                    if (symbol && symbol.endsWith('-USDT')) {
                        const asset = symbol.split('-')[0]; // "BTC"
                        priceMap.set(asset, price);
                    }
                });
            } catch (e) {
                console.warn('[BingXWS] Failed to fetch prices:', e.message);
            }

            // Helper to get USDT value
            const getUsdtValue = (asset, amount) => {
                if (amount <= 0) return 0;
                const a = asset.toUpperCase();
                if (a === 'USDT') return amount;
                const price = priceMap.get(a);
                return price ? amount * price : 0; // If no price found (e.g. delisted coin), value is 0
            };

            // Helper for signed requests
            const fetchSigned = async (path) => {
                const timestamp = Date.now().toString();
                const qs = `timestamp=${timestamp}`;
                const signature = crypto.createHmac('sha256', secretKey).update(qs).digest('hex');
                const url = `https://open-api.bingx.com${path}?${qs}&signature=${signature}`;
                try {
                    const res = await axios.get(url, { headers: { 'X-BX-APIKEY': apiKey } });
                    return (res.data.code === 0) ? res.data.data : null;
                } catch (err) {
                    console.error(`[BingXWS] Fetch ${path} failed:`, err.message);
                    return null;
                }
            };

            // =========================================================
            // 2. Fetch Spot Balances
            // =========================================================
            if (all || accountType === 'spot') {
                const data = await fetchSigned('/openApi/spot/v1/account/balance');
                const list = data?.balances || [];

                list.forEach(coin => {
                    const free = parseFloat(coin.free);
                    const locked = parseFloat(coin.locked);
                    const total = free + locked;
                    if (total > 0) {
                        balances.push({
                            accountType: 'spot',
                            asset: coin.asset,
                            free: free,
                            locked: locked,
                            usdtBalance: getUsdtValue(coin.asset, total)
                        });
                    }
                });
            }

            // =========================================================
            // 3. Fetch Fund Account (Crucial: Missing in previous versions)
            // =========================================================
            if (all || accountType === 'fund') {
                const data = await fetchSigned('/openApi/fund/v1/account/balance');
                const list = data?.assets || [];

                list.forEach(coin => {
                    const free = parseFloat(coin.free);
                    const locked = parseFloat(coin.locked);
                    const total = free + locked;
                    if (total > 0) {
                        balances.push({
                            accountType: 'fund',
                            asset: coin.asset,
                            free: free,
                            locked: locked,
                            usdtBalance: getUsdtValue(coin.asset, total)
                        });
                    }
                });
            }

            // =========================================================
            // 4. Fetch Futures Balances (USDT-M)
            // =========================================================
            if (all || accountType === 'futures') {
                const data = await fetchSigned('/openApi/swap/v2/user/balance');
                // The API can return nested { balance: {...} } or direct object
                const balObj = data?.balance || data || {};

                const equity = parseFloat(balObj.equity || 0);
                const available = parseFloat(balObj.availableMargin || 0);

                if (equity > 0) {
                    balances.push({
                        accountType: 'futures',
                        asset: balObj.currency || 'USDT',
                        free: available,
                        locked: equity - available,
                        usdtBalance: equity // Already in USDT usually
                    });
                }
            }

            // =========================================================
            // 5. Fetch Coin-M Balances (Inverse)
            // =========================================================
            if (all || accountType === 'coin-m') {
                // Note: Coin-M uses /openApi/cswap/v1
                const { apiKey, secretKey } = account;
                const timestamp = Date.now().toString();
                const qs = `timestamp=${timestamp}`;
                const signature = crypto.createHmac('sha256', secretKey).update(qs).digest('hex');
                const url = `https://open-api.bingx.com/openApi/cswap/v1/user/balance?${qs}&signature=${signature}`;

                try {
                    const res = await axios.get(url, { headers: { 'X-BX-APIKEY': apiKey } });
                    if (res.data.code === 0) {
                        let list = [];
                        if (Array.isArray(res.data.data)) {
                            list = res.data.data;
                        } else if (res.data.data?.balance) {
                            list = res.data.data.balance;
                        }

                        list.forEach(coin => {
                            const equity = parseFloat(coin.equity || 0);
                            const asset = coin.asset.toUpperCase();

                            if (equity > 0) {
                                balances.push({
                                    accountType: 'coin-m',
                                    asset: asset,
                                    free: parseFloat(coin.availableMargin || 0),
                                    locked: equity - parseFloat(coin.availableMargin || 0),
                                    usdtBalance: getUsdtValue(asset, equity)
                                });
                            }
                        });
                    }
                } catch (err) {
                    console.error('[BingXWS] Coin-M fetch failed:', err.message);
                }
            }

            return balances;

        } catch (err) {
            console.error(`[BingXWS] getBalance failed:`, err.message);
            return [];
        }
    }

    /**
     * Preserved helper for Cron jobs checking singular Spot USDT balance.
     * Re-uses the raw method.
     */
    async getSpotBalance(account) {
        const balances = await this.getSpotBalanceRaw(account);
        const usdt = balances.find(b => b.asset === 'USDT');
        return usdt ? parseFloat(usdt.free) : 0;
    }

    /**
     * Preserved helper for Cron jobs checking singular Futures USDT balance.
     * Re-uses the raw method.
     */
    async getFuturesBalance(account) {
        const data = await this.getFuturesBalanceRaw(account);
        return data ? parseFloat(data.balance) : 0; // .balance is usually the wallet balance (excl upnl)
    }

    // =========================================================================
    // END UPDATED BALANCE LOGIC
    // =========================================================================

    getParameters(API, timestamp, urlEncode) {
        let parameters = ""
        for (const key in API.payload) {
            if (urlEncode) {
                parameters += key + "=" + encodeURIComponent(API.payload[key]) + "&"
            } else {
                parameters += key + "=" + API.payload[key] + "&"
            }
        }
        if (parameters) {
            parameters = parameters.substring(0, parameters.length - 1)
            parameters = parameters + "&timestamp=" + timestamp
        } else {
            parameters = "timestamp=" + timestamp
        }
        return parameters
    }

    async executeOrder(orderDetails, account) {
        const { apiKey, secretKey } = account;
        const timestamp = Date.now().toString();

        const method = 'POST';
        const requestPath = '/api/v1/order/create';
        const body = JSON.stringify(orderDetails);
        const prehash = timestamp + method + requestPath + body;
        const signature = crypto
            .createHmac('sha256', secretKey)
            .update(prehash)
            .digest('hex');

        const endpoint = `https://open-api-swap.bingx.com${requestPath}?timestamp=${timestamp}&signature=${signature}`;

        const headers = {
            "Content-Type": "application/json",
            "X-BX-APIKEY": apiKey
        };

        try {
            const res = await fetch(endpoint, {
                method: method,
                headers,
                body
            });
            if (!res.ok) {
                throw new Error(`Order execution failed with status ${res.status}`);
            }
            const data = await res.json();
            console.log('Order executed successfully:', data);
            return data;
        } catch (error) {
            console.error('[BingXWS] Error executing order:', error);
            throw error;
        }
    }

    async fetchSymbolInfo(symbol, apiKey) {
        const resp = await axios.get('https://api.bingx.com/api/v1/common/symbols', {
            params: { symbol: symbol.replace('/', '') },
            headers: {
                'X-API-KEY': apiKey
            }
        });
        return resp.data;
    }

    async getHistoricalBalance(account, date) {
        console.log(`[BingXWS] NOTE: getHistoricalBalance is not supported by the BingX API. Returning 0 for date ${date.toISOString().slice(0,10)}.`);
        return Promise.resolve(0);
    }

    async getHistoricalRealizedPnL(account, { days }) {
        const { apiKey, secretKey } = account;
        const endTime = Date.now();
        const startTime = endTime - (days * 24 * 60 * 60 * 1000);

        const params = {
            incomeType: 'REALIZED_PNL',
            startTime: startTime,
            endTime: endTime,
            limit: 1000,
            timestamp: Date.now().toString()
        };

        const queryString = new URLSearchParams(params).toString();
        const signature = crypto.createHmac('sha256', secretKey).update(queryString).digest('hex');

        const url = `https://open-api.bingx.com/openApi/swap/v2/user/income?${queryString}&signature=${signature}`;

        try {
            const res = await fetch(url, { headers: { 'X-BX-APIKEY': apiKey } });
            const json = await res.json();

            if (json.code !== 0) {
                throw new Error(`BingX Realized PnL Error: ${json.msg || json.message}`);
            }

            const incomeRecords = Array.isArray(json.data?.income) ? json.data.income : [];
            const dailyGroups = {};
            for (const record of incomeRecords) {
                const dateKey = new Date(parseInt(record.time, 10)).toISOString().slice(0, 10);
                const pnl = parseFloat(record.income || 0);
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

            if (json.code !== 0) {
                throw new Error(`BingX error: ${json.msg || json.message}`);
            }

            const positions = Array.isArray(json.data) ? json.data : [];

            return positions.map(pos => {
                const unrealizedPnl = parseFloat(pos.unrealizedPnl || 0);
                const initialMargin = parseFloat(pos.initialMargin || 0);
                const pnlPercentage = (initialMargin > 0)
                    ? (unrealizedPnl / initialMargin) * 100
                    : 0;

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

    async getDetailedBalance(account) {
        const { apiKey, secretKey } = account;

        // Helper to sign and send requests
        const sendRequest = async (path, params = {}) => {
            const timestamp = Date.now();
            const qs = new URLSearchParams({ ...params, timestamp }).toString();
            const sig = crypto.createHmac('sha256', secretKey).update(qs).digest('hex');
            const url = `https://open-api.bingx.com${path}?${qs}&signature=${sig}`;

            try {
                const resp = await axios.get(url, { headers: { 'X-BX-APIKEY': apiKey } });
                if (resp.data?.code !== 0) {
                    console.warn(`[BingXWS] API warning (${path}): ${resp.data?.msg || 'unknown'}`);
                    return null;
                }
                return resp.data.data;
            } catch (e) {
                console.warn(`[BingXWS] Request failed (${path}): ${e.message}`);
                return null;
            }
        };

        try {
            // 1. Fetch Market Prices for USDT conversion
            const pxRes = await axios.get('https://open-api.bingx.com/openApi/spot/v1/ticker/24hr');
            const raw = pxRes.data?.data || [];

            // Map: "BTCUSDT" -> 65000.00
            const priceMap = new Map(
                (Array.isArray(raw) ? raw : []).map(t => [
                    String((t.symbol || t.s || '').replace('-', '')).toUpperCase(),
                    parseFloat(t.lastPrice || t.c || '0')
                ])
            );

            const getUsdtValue = (asset, amount) => {
                const a = String(asset || '').toUpperCase();
                if (a === 'USDT') return amount;

                // Try finding ASSET+USDT (e.g., BTCUSDT)
                let p = priceMap.get(`${a}USDT`);
                if (!p) {
                    // Fallback for weird symbols or USDC
                    p = priceMap.get(`${a}USDC`);
                }
                return p ? amount * p : 0;
            };

            const result = [];

            // ==========================================
            // 1. SPOT ACCOUNTS
            // ==========================================
            const spotData = await sendRequest('/openApi/spot/v1/account/balance');
            const spotBalances = Array.isArray(spotData?.balances) ? spotData.balances : [];

            const spotAssets = spotBalances
                .map(b => {
                    const asset  = b.asset?.toUpperCase() || '';
                    const free   = parseFloat(b.free || 0);
                    const locked = parseFloat(b.locked || 0);
                    const amount = free + locked;
                    return { name: asset, amount };
                })
                .filter(x => x.amount > 1e-8)
                .map(x => ({ ...x, value: getUsdtValue(x.name, x.amount) }))
                .filter(x => x.value > 0.01);

            const spotTotal = spotAssets.reduce((s, a) => s + a.value, 0);

            result.push({
                accountType: 'Spot',
                value: spotTotal,
                balances: spotAssets.length > 0 ? spotBalances : [],
                children: spotAssets.sort((a, b) => b.value - a.value)
            });

            // ==========================================
            // 2. FUND ACCOUNTS
            // ==========================================
            const fundData = await sendRequest('/openApi/fund/v1/account/balance');
            const fundBalances = Array.isArray(fundData?.assets) ? fundData.assets : [];

            const fundAssets = fundBalances
                .map(b => {
                    const asset  = b.asset?.toUpperCase() || '';
                    const free   = parseFloat(b.free || 0);
                    const locked = parseFloat(b.locked || 0);
                    const amount = free + locked;
                    return { name: asset, amount };
                })
                .filter(x => x.amount > 1e-8)
                .map(x => ({ ...x, value: getUsdtValue(x.name, x.amount) }))
                .filter(x => x.value > 0.01);

            const fundTotal = fundAssets.reduce((s, a) => s + a.value, 0);

            result.push({
                accountType: 'Fund',
                value: fundTotal,
                balances: fundAssets.length > 0 ? fundBalances : [],
                children: fundAssets.sort((a, b) => b.value - a.value)
            });

            // ==========================================
            // 3. USDT-M FUTURES (Standard)
            // ==========================================
            const futBal = await sendRequest('/openApi/swap/v2/user/balance');
            const futPos = await sendRequest('/openApi/swap/v2/user/positions');

            // Handle structure difference: sometimes data is array, sometimes object inside data
            const actualFutBal = futBal?.balance || {};
            const walletBalance = parseFloat(actualFutBal.balance || 0);

            const futPositions = (Array.isArray(futPos) ? futPos : [])
                .map(p => ({
                    symbol: p.symbol,
                    side: String(p.positionSide || p.side || 'BOTH').toUpperCase(),
                    size: parseFloat(p.positionAmt || p.qty || 0),
                    leverage: parseFloat(p.leverage || 0),
                    marginType: String(p.marginType || 'UNKNOWN').toUpperCase(),
                    entryPrice: parseFloat(p.entryPrice || 0),
                    markPrice: parseFloat(p.markPrice || 0),
                    unrealizedPnl: parseFloat(p.unrealizedPnl || p.uPnl || 0),
                    notional: parseFloat(p.positionValue || p.notional || 0),
                }))
                .filter(p => Math.abs(p.notional) > 0.01 || Math.abs(p.unrealizedPnl) > 0.01);

            const totalUnrealizedPnl = futPositions.reduce((s, p) => s + (p.unrealizedPnl || 0), 0);
            const futuresValue = walletBalance + totalUnrealizedPnl;

            const futChildren = [];
            if (walletBalance > 0.01) {
                futChildren.push({ name: 'Wallet (USDT)', value: walletBalance, amount: walletBalance });
            }
            if (futPositions.length) {
                futChildren.push(
                    ...futPositions
                        .map(p => ({ name: p.symbol, value: Math.abs(p.notional || 0) }))
                        .filter(x => x.value > 0.01)
                        .sort((a, b) => b.value - a.value)
                );
            }

            result.push({
                accountType: 'Futures',
                subType: 'USDT-M',
                value: futuresValue,
                walletBalance,
                totalUnrealizedPnl,
                positions: futPositions,
                children: futChildren
            });

            // ==========================================
            // 4. COIN-M FUTURES (Inverse) - UPDATED
            // ==========================================
            const coinMBalResponse = await sendRequest('/openApi/cswap/v1/user/balance');
            const coinMPosResponse = await sendRequest('/openApi/cswap/v1/user/positions');

            // FIX: Handle response being a direct array OR an object with a balance key
            let coinMBalances = [];
            if (Array.isArray(coinMBalResponse)) {
                coinMBalances = coinMBalResponse;
            } else if (coinMBalResponse?.balance && Array.isArray(coinMBalResponse.balance)) {
                coinMBalances = coinMBalResponse.balance;
            }

            const coinMPositionsRaw = Array.isArray(coinMPosResponse) ? coinMPosResponse : [];

            let coinMTotalUsdtValue = 0;
            const coinMChildren = [];

            // Process Balance (Assets held like BTC, ETH)
            coinMBalances.forEach(b => {
                const asset = b.asset?.toUpperCase(); // e.g., "BTC"
                const equity = parseFloat(b.equity || 0); // Use equity (includes unrl PnL)

                if (equity > 0) {
                    const usdtVal = getUsdtValue(asset, equity);
                    coinMTotalUsdtValue += usdtVal;

                    if (usdtVal > 0.01) {
                        coinMChildren.push({
                            name: `${asset} Equity`,
                            amount: equity,
                            value: usdtVal
                        });
                    }
                }
            });

            // Process Positions
            const coinMPositions = coinMPositionsRaw.map(p => {
                return {
                    symbol: p.symbol,
                    side: String(p.positionSide || p.side || 'BOTH').toUpperCase(),
                    size: parseFloat(p.positionAmt || 0),
                    leverage: parseFloat(p.leverage || 0),
                    entryPrice: parseFloat(p.entryPrice || 0),
                    markPrice: parseFloat(p.markPrice || 0),
                    unrealizedPnl: parseFloat(p.unrealizedPnl || 0),
                    notional: parseFloat(p.positionValue || 0), // Usually USD value in Coin-M
                };
            }).filter(p => Math.abs(p.notional) > 1.0 || Math.abs(p.unrealizedPnl) > 0.0001);

            // Add positions to children for visualization
            if (coinMPositions.length > 0) {
                coinMChildren.push(
                    ...coinMPositions.map(p => ({
                        name: `${p.symbol} Pos`,
                        value: Math.abs(p.notional),
                        amount: p.size
                    })).sort((a, b) => b.value - a.value)
                );
            }

            if (coinMTotalUsdtValue > 0.01 || coinMPositions.length > 0) {
                result.push({
                    accountType: 'Coin-M',
                    subType: 'Inverse',
                    value: coinMTotalUsdtValue,
                    walletBalance: 0, // Not summed because assets differ (BTC, ETH, etc.)
                    totalUnrealizedPnl: 0, // Not summed because currencies differ
                    positions: coinMPositions,
                    children: coinMChildren.sort((a, b) => b.value - a.value)
                });
            }

            return result;

        } catch (err) {
            console.error('[BingXWS] getDetailedBalance error:', err.message);
            return [];
        }
    }
}

module.exports = new BingXWS();
