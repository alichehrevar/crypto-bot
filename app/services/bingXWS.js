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
     * @param {string} timestamp - The timestamp as a string.
     * @param {string} apiSecret - The API secret key.
     * @returns {string} The generated signature.
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

        // REMOVED: this.setupPingInterval();

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

                // This part is correct and is all you need for keep-alive
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

    /**
     * Authenticate the WebSocket connection.
     * This function now requires that you pass in the API key and secret from the user's account.
     * For now, it is a placeholder.
     *
     * @param {string} timestamp
     * @param {string} signature
     * @param {string} apiKey - User provided API key.
     */
    authenticate(timestamp, signature, apiKey) {
        const authMessage = {
            event: "login",
            params: {
                apiKey: apiKey, // Use the user-provided API key.
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

    setupPingInterval() {
        this.pingInterval = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.ping();
            }
        }, 25000);

        // Ping/Pong handlers.
        this.ws.on('ping', () => {
            console.debug('[BingXWS] Received ping');
            this.ws.pong();
        });

        this.ws.on('pong', () => {
            console.debug('[BingXWS] Received pong');
        });
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
            // Handle kline messages.
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

        // Validate numeric values.
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
            '1m': '1m',
            '3m': '3m',
            '5m': '5m',
            '15m': '15m',
            '30m': '30m',
            '1h': '1h',
            '2h': '2h',
            '4h': '4h',
            '6h': '6h',
            '8h': '8h',
            '12h': '12h',
            '1d': '1d',
            '3d': '3d',
            '1w': '1w',
            '1M': '1M'
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

    // Public methods for managing the connection.
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

    /**
     * Attempt to gunzip & parse JSON; if it’s a plain “Ping” frame or
     * fails to decompress/parse, return a ping object or null.
     */
    parseBinaryMessage(data) {
        // First, try a quick string check in case it's not gzipped at all
        const raw = data.toString();
        if (raw === 'Ping' || raw === 'pong' || raw === 'PING') {
            // normalize into your existing ping handler format
            return { ping: Date.now() };
        }

        try {
            // Attempt to gunzip
            const decompressed = zlib.gunzipSync(data);
            const text = decompressed.toString();

            // Only JSON.parse if it looks like JSON
            const first = text.trim()[0];
            if (first === '{' || first === '[') {
                return JSON.parse(text);
            } else {
                // non-JSON text, treat as ping
                return { ping: text };
            }
        } catch (err) {
            // zlib error or parse error
            console.debug('[BingXWS] parseBinaryMessage non-gzip or invalid JSON:', err.message);
            return null;
        }
    }

    /**
     * Fetches the Spot (Fund) Account Balance.
     * This hits the /spot/v1/account/balance endpoint.
     * @param {object} account - User's account with apiKey and secretKey.
     * @returns {Promise<number>} - The free USDT balance in the spot account.
     */
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

        try {
            const resp = await axios.get(url, { headers: { "X-BX-APIKEY": apiKey } });
            const json = resp.data;

            if (json.code !== 0) {
                throw new Error(`BingX Spot Balance Error (${json.code}): ${json.msg}`);
            }

            const usdtAsset = json.data.balances.find(b => b.asset === 'USDT');
            return usdtAsset ? parseFloat(usdtAsset.free) : 0;

        } catch (err) {
            const errorMessage = err.response?.data?.msg || err.message;
            console.error('[BingXWS] getSpotBalance Error:', errorMessage);
            throw new Error(errorMessage);
        }
    }

    /**
     * Fetches the Perpetual Futures Account Balance.
     * This hits the /swap/v2/balance endpoint.
     * @param {object} account - User's account with apiKey and secretKey.
     * @returns {Promise<number>} - The USDT balance in the futures account.
     */
    async getFuturesBalance(account) {
        const { apiKey, secretKey } = account;
        const timestamp = Date.now().toString();
        const base = 'https://open-api.bingx.com';

        // THIS IS THE CORRECTED LINE:
        const path = '/openApi/swap/v2/user/balance';

        const queryParams = new URLSearchParams({ timestamp });
        const toSign = queryParams.toString();
        const signature = crypto.createHmac('sha256', secretKey).update(toSign).digest('hex');
        queryParams.append('signature', signature);

        const url = `${base}${path}?${queryParams.toString()}`;

        try {
            const resp = await axios.get(url, { headers: { 'X-BX-APIKEY': apiKey } });
            const json = resp.data;

            if (json.code !== 0) {
                throw new Error(`BingX Futures Balance Error (${json.code}): ${json.msg}`);
            }

            // The response structure for this endpoint has the balance details under data.balance
            const usdtAsset = json.data.balance;
            return usdtAsset ? parseFloat(usdtAsset.balance) : 0;

        } catch (err) {
            const errorMessage = err.response?.data?.msg || err.message;
            console.error('[BingXWS] getFuturesBalance Error:', errorMessage);
            throw new Error(errorMessage);
        }
    }

    /**
     * Main getBalance function with updated logic for the 'accountType' parameter.
     * @param {object} account - User's account credentials.
     * @param {object} options - Contains 'all' and 'accountType' flags.
     * @returns {Promise<Array<{accountType: string, usdtBalance: string}>>}
     */
    async getBalance(account, { all = false, accountType = '' } = {}) {
        console.log(`[BingXWS] getBalance called with accountType: ${all} ${accountType}`);
        try {
            // Case 1: `all` is true, so we get the combined total of spot and futures.
            if (all) {
                const [spotBalance, futuresBalance] = await Promise.all([
                    this.getSpotBalance(account),
                    this.getFuturesBalance(account)
                ]);

                const totalBalance = spotBalance + futuresBalance;
                return [{
                    accountType: 'total', // A combined type
                    usdtBalance: totalBalance.toString()
                }];
            }

            // Case 2: `all` is false, so we check the specific accountType requested.
            if (accountType === 'futures') {
                const futuresBalance = await this.getFuturesBalance(account);
                return [{
                    accountType: 'futures',
                    usdtBalance: futuresBalance.toString()
                }];
            }

            // Default Case: If `all` is false and `accountType` is 'spot' or empty, return spot balance.
            const spotBalance = await this.getSpotBalance(account);
            return [{
                accountType: 'spot',
                usdtBalance: spotBalance.toString()
            }];

        } catch (err) {
            console.error(`[BingXWS] Main getBalance orchestrator failed:`, err.message);
            // Return a zero balance on failure to prevent crashing the entire summary.
            return [{ accountType: 'error', usdtBalance: '0' }];
        }
    }

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
        // orderDetails might include properties such as:
        // { symbol, side, orderType, quantity, price (if limit order), etc. }
        // account is the user's BingX account object with apiKey and secretKey.

        const { apiKey, secretKey } = account;
        const timestamp = Date.now().toString();

        // Construct a prehash string as required by BingX for signing the order request.
        // Example: prehash = timestamp + HTTP_METHOD + requestPath + body
        // (Consult BingX API documentation for the required signature format.)
        const method = 'POST';
        const requestPath = '/api/v1/order/create'; // Example path; update as needed.
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

    /**
     * @description Placeholder for fetching historical balance. BingX API does not currently support
     * fetching a total account balance for a specific past date.
     * @param {object} account The user's BingX account credentials.
     * @param {Date} date The date for which to fetch the balance.
     * @returns {Promise<number>} Always returns 0 as this feature is not supported by the API.
     */
    async getHistoricalBalance(account, date) {
        console.log(`[BingXWS] NOTE: getHistoricalBalance is not supported by the BingX API. Returning 0 for date ${date.toISOString().slice(0,10)}.`);
        // This function must exist for the cron job to run without errors, but it returns 0.
        // The cron job will only get BingX balances for the CURRENT day using the getBalance({ all: true }) method.
        return Promise.resolve(0);
    }

    /**
     * @description Fetches realized PnL from BingX USDT-M futures income history for a specified number of days.
     * @param {object} account The user's account credentials.
     * @param {object} options Contains the number of days of history to fetch.
     * @returns {Promise<Array<{timestamp: number, profit: number}>>} A promise resolving to an array of daily PnL objects.
     */
    async getHistoricalRealizedPnL(account, { days }) {
        const { apiKey, secretKey } = account;
        const endTime = Date.now();
        const startTime = endTime - (days * 24 * 60 * 60 * 1000);

        const params = {
            incomeType: 'REALIZED_PNL',
            startTime: startTime,
            endTime: endTime,
            limit: 1000, // Max limit
            timestamp: Date.now().toString()
        };

        const queryString = new URLSearchParams(params).toString();
        const signature = crypto.createHmac('sha256', secretKey).update(queryString).digest('hex');

        // Use the correct endpoint for income history
        const url = `https://open-api.bingx.com/openApi/swap/v2/user/income?${queryString}&signature=${signature}`;

        try {
            const res = await fetch(url, { headers: { 'X-BX-APIKEY': apiKey } });
            const json = await res.json();

            if (json.code !== 0) {
                throw new Error(`BingX Realized PnL Error: ${json.msg || json.message}`);
            }

            const incomeRecords = Array.isArray(json.data?.income) ? json.data.income : [];

            // Group the records by UTC date and sum the profit for each day
            const dailyGroups = {};
            for (const record of incomeRecords) {
                const dateKey = new Date(parseInt(record.time, 10)).toISOString().slice(0, 10);
                const pnl = parseFloat(record.income || 0);
                dailyGroups[dateKey] = (dailyGroups[dateKey] || 0) + pnl;
            }

            // Convert the grouped data into the final array format
            return Object.entries(dailyGroups).map(([date, profit]) => ({
                timestamp: new Date(`${date}T00:00:00Z`).getTime(),
                profit
            }));
        } catch (err) {
            console.error('[BingXWS] getHistoricalRealizedPnL Error:', err.message);
            return []; // Return empty array on failure
        }
    }

    /**
     * @description Fetches all open positions to calculate unrealized PnL.
     * This has been updated to use the correct endpoint and return a detailed array of positions.
     * @param {object} account The user's account credentials.
     * @returns {Promise<Array<object>>} An array of open position objects.
     */
    async getUnrealizedPnLHistory(account, { days }) {
        const { apiKey, secretKey } = account;
        const ts = Date.now().toString();
        const qs = `timestamp=${ts}`;
        const sig = crypto.createHmac('sha256', secretKey).update(qs).digest('hex');

        // =================================================================
        // CORRECTED API PATH
        // =================================================================
        const url = `https://open-api.bingx.com/openApi/swap/v2/user/positions?${qs}&signature=${sig}`;

        try {
            const res = await fetch(url, {
                headers: {
                    'X-BX-APIKEY': apiKey,
                }
            });

            const json = await res.json();

            console.log('[BingXWS] getUnrealizedPnLHistory response:', json);
            if (json.code !== 0) {
                throw new Error(`BingX error: ${json.msg || json.message}`);
            }

            // =================================================================
            // CORRECTED DATA SHAPE
            // The API returns an array of positions in json.data. We process each one.
            // =================================================================
            const positions = Array.isArray(json.data) ? json.data : [];

            return positions.map(pos => {
                const unrealizedPnl = parseFloat(pos.unrealizedPnl || 0);
                const initialMargin = parseFloat(pos.initialMargin || 0);

                // Calculate PnL as a percentage of the initial margin.
                const pnlPercentage = (initialMargin > 0)
                    ? (unrealizedPnl / initialMargin) * 100
                    : 0;

                // Return a detailed object that the pnlController can use.
                return {
                    symbol: pos.symbol,
                    leverage: pos.leverage,
                    unrealizedPnl: unrealizedPnl.toFixed(2), // The absolute PnL value
                    pct: parseFloat(pnlPercentage.toFixed(2)), // The percentage PnL
                    timestamp: parseInt(pos.positionTimestamp, 10) || Date.now(),
                };
            });

        } catch (err) {
            console.error('[BingXWS] getUnrealizedPnLHistory Error:', err.message);
            // Return empty array on failure so Promise.all doesn't break.
            return [];
        }
    }

    /**
     * @description Fetches a detailed breakdown of assets for Spot and Futures accounts.
     * @param {object} account The user's BingX account credentials.
     * @returns {Promise<Array<object>>} A promise resolving to an array of account types with their assets.
     */
    async getDetailedBalance(account) {
        const { apiKey, secretKey } = account;

        const sendRequest = async (path, params = {}) => {
            const timestamp = Date.now();
            const queryParams = new URLSearchParams({ ...params, timestamp });
            const signature = crypto.createHmac('sha256', secretKey).update(queryParams.toString()).digest('hex');
            queryParams.append('signature', signature);
            const url = `https://open-api.bingx.com${path}?${queryParams.toString()}`;

            try {
                const resp = await axios.get(url, { headers: { "X-BX-APIKEY": apiKey } });
                if (resp.data.code !== 0) {
                    throw new Error(`BingX API Error (${path}): ${resp.data.msg}`);
                }
                return resp.data.data;
            } catch (err) {
                const errorMessage = err.response?.data?.msg || err.message;
                console.error(`[BingXWS] Request failed for ${path}:`, errorMessage);
                throw err;
            }
        };

        try {
            // 1. Fetch all ticker prices for value conversion
            const priceData = await axios.get('https://open-api.bingx.com/openApi/spot/v1/ticker/24hr');
            const priceMap = new Map(priceData.ticker.map(t => [t.symbol.replace('-', ''), parseFloat(t.lastPrice)]));
            const getUsdtValue = (asset, amount) => {
                if (asset.toUpperCase() === 'USDT') return amount;
                const price = priceMap.get(`${asset.toUpperCase()}USDT`);
                return price ? amount * price : 0;
            };

            const result = [];

            // 2. Fetch Spot Balance (Fund Account)
            const spotData = await axios.get('https://open-api.bingx.com/openApi/spot/v1/account/balance');
            const spotAssets = spotData.balances
                .map(b => ({
                    name: b.asset,
                    amount: parseFloat(b.free),
                }))
                .filter(b => b.amount > 0.000001)
                .map(b => ({ ...b, value: getUsdtValue(b.name, b.amount) }))
                .filter(b => b.value > 0.01);

            const spotTotal = spotAssets.reduce((sum, asset) => sum + asset.value, 0);

            if (spotTotal > 0.01) {
                result.push({
                    accountType: 'Spot',
                    value: spotTotal,
                    children: spotAssets.map(a => ({ name: a.name, value: a.value })).sort((a,b) => b.value - a.value)
                });
            }

            // 3. Fetch Futures Balance (Perpetual Swap Account)
            const [futBalanceData, futPositionsData] = await Promise.all([
                await axios.get('https://open-api.bingx.com/openApi/swap/v2/user/balance'),
                await axios.get('https://open-api.bingx.com/openApi/swap/v2/user/positions')
            ]);

            const futureTotal = parseFloat(futBalanceData.balance.balance);

            if (futureTotal > 0.01) {
                const futPositions = futPositionsData
                    .map(p => ({
                        name: p.symbol,
                        value: parseFloat(p.positionValue),
                    }))
                    .filter(p => p.value > 0.01);

                result.push({
                    accountType: 'Future',
                    value: futureTotal,
                    children: futPositions.sort((a,b) => b.value - a.value)
                });
            }

            // BingX doesn't have a simple summary endpoint for Earn products,
            // so we will stick to Spot and Futures.

            return result;

        } catch (err) {
            console.error('BingXWS getDetailedBalance error:', err.message);
            return [];
        }
    }
}

// Export a singleton instance.
module.exports = new BingXWS();
