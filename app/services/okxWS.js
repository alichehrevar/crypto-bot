const WebSocket = require('ws');
const axios = require('axios');
const crypto = require('crypto');

class OKXWS {
    constructor() {
        this.ws = null;
        // Default credentials can be provided via environment variables if needed.
        this.apiKey = process.env.OKX_API_KEY;
        this.apiSecret = process.env.OKX_API_SECRET;
        this.passphrase = process.env.OKX_PASSPHRASE;
        // You might want to add reconnect logic, subscriptions map etc. as needed.
    }

    /**
     * Connects to the OKX WebSocket endpoint.
     * For private data (account updates) use the private endpoint.
     */
    connect() {
        // OKX WebSocket endpoint for private data (account and orders).
        const endpoint = 'wss://ws.okx.com:8443/ws/v5/private';
        this.ws = new WebSocket(endpoint);

        // Set up basic event listeners.
        this.ws.on('open', () => {
            console.log('[OKXWS] Connected to OKX WebSocket');
            // Optionally, perform authentication over WS here.
            // (OKX may require you to send an auth message after connecting.)
            // For now, we leave that out since our getBalance uses REST.
        });

        this.ws.on('message', (data) => {
            // Handle incoming messages as needed.
            try {
                const message = JSON.parse(data);
                console.log('[OKXWS] Received message:', message);
            } catch (error) {
                console.error('[OKXWS] Failed to parse message:', error);
            }
        });

        this.ws.on('error', (error) => {
            console.error('[OKXWS] WebSocket error:', error);
        });

        this.ws.on('close', (code, reason) => {
            console.warn(`[OKXWS] WebSocket closed with code ${code}: ${reason}`);
            this.ws = null;
            // Optionally add reconnect logic here.
        });
    }

    /**
     * Disconnects from the OKX WebSocket.
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    /**
     * Generates the OKX signature using the provided API secret.
     * OKX requires a prehash string in the format: timestamp + method + requestPath + body.
     *
     * @param {string} timestamp - ISO timestamp.
     * @param {string} method - HTTP method (e.g., "GET").
     * @param {string} requestPath - The API request path and query string.
     * @param {string} body - The request body (empty for GET).
     * @returns {string} - The Base64-encoded signature.
     */
    generateSignature(timestamp, method, requestPath, body = '') {
        const prehash = timestamp + method + requestPath + body;
        return crypto.createHmac('sha256', this.apiSecret).update(prehash).digest('base64');
    }

    /**
     * Fetches the account balance for the provided OKX account via REST API.
     * Assumes the account object includes: apiKey, apiSecret, passphrase.
     *
     * @param {Object} account - The account object with credentials.
     * @param all
     * @returns {Promise<number>} - The available USDT balance.
     */
    async getBalance(account, { all = false } = {}) {
        const { apiKey, apiSecret, passphrase } = account;
        const timestamp = new Date().toISOString();
        const method = 'GET';
        const headers = {
            'OK-ACCESS-KEY': apiKey,
            'OK-ACCESS-SIGN': crypto
                .createHmac('sha256', apiSecret)
                .update(timestamp + method + (all
                        ? '/api/v5/account/positions?instType=FUTURES'
                        : '/api/v5/account/balance?ccy=USDT'
                ) + '')
                .digest('base64'),
            'OK-ACCESS-TIMESTAMP': timestamp,
            'OK-ACCESS-PASSPHRASE': passphrase,
            'Content-Type': 'application/json',
        };

        // 1) Spot-only
        if (!all) {
            const spotRes = await axios.get(
                'https://www.okx.com/api/v5/account/balance?ccy=USDT',
                { headers }
            );
            if (spotRes.data.code !== '0') {
                throw new Error(`OKX balance error: ${spotRes.data.msg}`);
            }
            const detail = spotRes.data.data[0].details.find(d => d.ccy === 'USDT');
            return detail ? parseFloat(detail.availBal) : 0;
        }

        // 2) Both spot & futures
        const [spotRes, posRes] = await Promise.all([
            axios.get('https://www.okx.com/api/v5/account/balance?ccy=USDT', { headers }),
            axios.get('https://www.okx.com/api/v5/account/positions?instType=FUTURES', { headers }),
        ]);

        // Spot part
        if (spotRes.data.code !== '0') {
            throw new Error(`OKX balance error: ${spotRes.data.msg}`);
        }
        const spotDetail = spotRes.data.data[0].details.find(d => d.ccy === 'USDT');
        const spotBalance = spotDetail ? parseFloat(spotDetail.availBal) : 0;

        // Futures part (sum the initial margin requirement for USDT-margined futures)
        if (posRes.data.code !== '0') {
            throw new Error(`OKX positions error: ${posRes.data.msg}`);
        }
        const futuresBalance = posRes.data.data
            .reduce((sum, p) => sum + parseFloat(p.imr || 0), 0);

        // Return in the same “accountType + usdtBalance” shape
        return [
            { accountType: 'spot',  usdtBalance: spotBalance.toString()  },
            { accountType: 'futures', usdtBalance: futuresBalance.toFixed(8) }
        ];
    }

    /**
     * @description Fetches the total account equity from OKX's balance history for a specific past date.
     * This endpoint provides a snapshot of total account value.
     * @param {object} account The user's OKX account credentials.
     * @param {Date} date The specific date for which to fetch the balance.
     * @returns {Promise<number>} The total USDT equity for that day.
     */
    async getHistoricalBalance(account, date) {
        const { apiKey, apiSecret, passphrase } = account;
        const timestamp = new Date().toISOString();
        const method = 'GET';

        // We want the snapshot at the very end of the requested day.
        const endOfDayTimestamp = new Date(date).setUTCHours(23, 59, 59, 999);
        const requestPath = `/api/v5/account/account-balance-history?after=${endOfDayTimestamp}&limit=1`;

        const prehash = timestamp + method + requestPath;
        const signature = crypto.createHmac('sha256', apiSecret).update(prehash).digest('base64');

        const headers = {
            'OK-ACCESS-KEY': apiKey,
            'OK-ACCESS-SIGN': signature,
            'OK-ACCESS-TIMESTAMP': timestamp,
            'OK-ACCESS-PASSPHRASE': passphrase,
            'Content-Type': 'application/json',
        };

        const url = `https://www.okx.com${requestPath}`;

        try {
            const res = await axios.get(url, { headers });
            if (res.data.code !== '0' || !res.data.data || res.data.data.length === 0) {
                console.log(`[OKXWS] No snapshot found for date ${date.toISOString().slice(0,10)}`);
                return 0;
            }

            // The 'details' array contains balances for various account types (spot, futures, etc.).
            // We sum the 'eq' (total equity) of all of them to get the total portfolio value.
            const details = res.data.data[0].details;
            return details ? details.reduce((sum, item) => sum + parseFloat(item.eq), 0) : 0;
        } catch (error) {
            console.error(`[OKXWS] getHistoricalBalance failed:`, error.response?.data || error.message);
            return 0;
        }
    }

    /**
     * Fetch up to `days` days of realized PnL from OKX’s income-history.
     * Shape: [ { timestamp: ms, profit: number }, … ]
     */
    async getHistoricalRealizedPnL(account, { days }) {
        const { apiKey, apiSecret, passphrase } = account;
        const timestamp = new Date().toISOString();
        const method    = 'GET';
        const requestPath = '/api/v5/account/income?instType=FUTURES&ccy=USDT';
        const preSign   = timestamp + method + requestPath;
        const signature = crypto.createHmac('sha256', apiSecret).update(preSign).digest('base64');

        const url = `https://www.okx.com${requestPath}`;
        const res = await axios.get(url, {
            headers: {
                'OK-ACCESS-KEY':        apiKey,
                'OK-ACCESS-SIGN':       signature,
                'OK-ACCESS-TIMESTAMP':  timestamp,
                'OK-ACCESS-PASSPHRASE': passphrase
            }
        });

        // res.data.data should be an array
        const arr = Array.isArray(res.data.data) ? res.data.data : [];
        const groups = {};
        for (const rec of arr) {
            // `ts` or maybe `ts` in each record, and `realizedPnl` or `real`
            const dateKey = new Date(rec.ts).toISOString().slice(0,10);
            const pnl     = parseFloat(rec.realizedPnl || rec.real || 0);
            groups[dateKey] = (groups[dateKey]||0) + pnl;
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
     * Fetch the current unrealized PnL snapshot from OKX positions.
     * Shape: [ { timestamp: ms, pct: number } ]
     */
    async getUnrealizedPnLHistory(account, { days }) {

        const { apiKey, apiSecret, passphrase } = account;
        const timestamp = new Date().toISOString();
        const method    = 'GET';
        const requestPath = '/api/v5/account/positions?instType=SWAP'; // Use SWAP for futures
        const preSign      = timestamp + method + requestPath;
        const signature    = crypto.createHmac('sha256', apiSecret).update(preSign).digest('base64');
        const url = `https://www.okx.com${requestPath}`;

        try {
            const res = await axios.get(url, {
                headers: {
                    'OK-ACCESS-KEY':        apiKey,
                    'OK-ACCESS-SIGN':       signature,
                    'OK-ACCESS-TIMESTAMP':  timestamp,
                    'OK-ACCESS-PASSPHRASE': passphrase
                }
            });

            const positions = Array.isArray(res.data.data) ? res.data.data : [];

            return positions.map(pos => {
                const unrealizedPnl = parseFloat(pos.upl || 0);
                const initialMargin = parseFloat(pos.imr || 0);
                const pnlPercentage = initialMargin > 0 ? (unrealizedPnl / initialMargin) * 100 : 0;

                return {
                    symbol: pos.instId,
                    leverage: pos.lever,
                    unrealizedPnl: unrealizedPnl.toFixed(2),
                    pct: parseFloat(pnlPercentage.toFixed(2)),
                    // IMPORTANT: We use `cTime` (creation time) as the timestamp
                    timestamp: parseInt(pos.cTime, 10)
                };
            });
        } catch(err) {
            console.error('[OKXWS] getUnrealizedPnLHistory Error:', err.response?.data || err.message);
            return [];
        }
    }

    /**
     * @description Fetches a detailed breakdown of assets for Funding, Trading, and Financial accounts.
     * @param {object} account The user's OKX account credentials.
     * @returns {Promise<Array<object>>} A promise resolving to an array of account types with their assets.
     */
    async getDetailedBalance(account) {
        const { apiKey, apiSecret, passphrase } = account;

        const getHeaders = (method, requestPath, body = '') => {
            const timestamp = new Date().toISOString();
            const prehash = timestamp + method + requestPath + body;
            const signature = crypto.createHmac('sha256', apiSecret).update(prehash).digest('base64');
            return {
                'OK-ACCESS-KEY': apiKey,
                'OK-ACCESS-SIGN': signature,
                'OK-ACCESS-TIMESTAMP': timestamp,
                'OK-ACCESS-PASSPHRASE': passphrase,
                'Content-Type': 'application/json',
            };
        };

        try {
            // 1. Fetch all ticker prices for value conversion
            const priceRes = await axios.get('https://www.okx.com/api/v5/market/tickers?instType=SPOT');
            const priceMap = new Map(priceRes.data.data.map(t => [t.instId.replace('-', ''), parseFloat(t.last)]));
            const getUsdtValue = (asset, amount) => {
                if (asset.toUpperCase() === 'USDT') return amount;
                const price = priceMap.get(`${asset.toUpperCase()}USDT`);
                return price ? amount * price : 0;
            };

            const result = [];

            // 2. Fetch Funding Account Balance (Spot assets)
            const fundingPath = '/api/v5/account/balance';
            const fundingRes = await axios.get(`https://www.okx.com${fundingPath}`, { headers: getHeaders('GET', fundingPath) });

            if (fundingRes.data.code === '0' && fundingRes.data.data.length > 0) {
                const fundingAssets = fundingRes.data.data[0].details
                    .map(b => ({
                        name: b.ccy,
                        amount: parseFloat(b.availBal) + parseFloat(b.frozenBal),
                    }))
                    .filter(b => b.amount > 0.000001)
                    .map(b => ({ ...b, value: getUsdtValue(b.name, b.amount) }))
                    .filter(b => b.value > 0.01);

                const fundingTotal = fundingAssets.reduce((sum, asset) => sum + asset.value, 0);

                if (fundingTotal > 0.01) {
                    result.push({
                        accountType: 'Spot',
                        value: fundingTotal,
                        children: fundingAssets.map(a => ({ name: a.name, value: a.value })).sort((a,b) => b.value - a.value)
                    });
                }
            }

            // 3. Fetch Trading Account Balance (Futures/Swaps)
            const tradingPath = '/api/v5/account/balance?ccy=USDT'; // For total equity
            const positionsPath = '/api/v5/account/positions?instType=SWAP'; // For positions

            const [tradingRes, positionsRes] = await Promise.all([
                axios.get(`https://www.okx.com${tradingPath}`, { headers: getHeaders('GET', tradingPath) }),
                axios.get(`https://www.okx.com${positionsPath}`, { headers: getHeaders('GET', positionsPath) })
            ]);

            let tradingTotal = 0;
            if (tradingRes.data.code === '0' && tradingRes.data.data.length > 0) {
                tradingTotal = parseFloat(tradingRes.data.data[0].totalEq);
            }

            if (tradingTotal > 0.01) {
                const tradingPositions = (positionsRes.data.data || [])
                    .map(p => ({
                        name: p.instId,
                        value: parseFloat(p.notionalUsd)
                    }))
                    .filter(p => p.value > 0.01);

                result.push({
                    accountType: 'Future',
                    value: tradingTotal,
                    children: tradingPositions.sort((a,b) => b.value - a.value)
                });
            }

            // 4. Fetch Financial Account Balance (Earn/Grow products)
            const assetPath = '/api/v5/asset/asset-valuation?ccy=USDT';
            const assetRes = await axios.get(`https://www.okx.com${assetPath}`, { headers: getHeaders('GET', assetPath) });
            if(assetRes.data.code === '0' && assetRes.data.data.length > 0) {
                const details = assetRes.data.data[0].details;
                const earnTotal = parseFloat(details.earn || '0');
                if (earnTotal > 0.01) {
                    result.push({
                        accountType: 'Fund',
                        value: earnTotal,
                        children: [{ name: 'Earn Products', value: earnTotal }]
                    });
                }
            }

            return result;

        } catch (err) {
            console.error('OKXWS getDetailedBalance error:', err.response?.data || err.message);
            return [];
        }
    }
}

module.exports = new OKXWS();
