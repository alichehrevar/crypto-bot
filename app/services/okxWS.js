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

    async getHistoricalBalance(account, timestamp) {
        return this.getBalance(account);
    }
}

module.exports = new OKXWS();
