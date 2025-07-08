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
     * @returns {Promise<number>} - The available USDT balance.
     */
    async getBalance(account) {
        const { apiKey, apiSecret, passphrase } = account;
        // Use current timestamp in ISO format.
        const timestamp = new Date().toISOString();
        const method = 'GET';
        // We request USDT balance.
        const requestPath = '/api/v5/account/balance?ccy=USDT';
        const body = ''; // GET request has no body.
        const signature = crypto
            .createHmac('sha256', apiSecret)
            .update(timestamp + method + requestPath + body)
            .digest('base64');
        const url = `https://www.okx.com${requestPath}`;
        try {
            const response = await axios.get(url, {
                headers: {
                    'OK-ACCESS-KEY': apiKey,
                    'OK-ACCESS-SIGN': signature,
                    'OK-ACCESS-TIMESTAMP': timestamp,
                    'OK-ACCESS-PASSPHRASE': passphrase,
                    'Content-Type': 'application/json'
                }
            });
            // OKX typically returns data in the following format:
            // { code: "0", msg: "", data: [ { details: [ { ccy: "USDT", availBal: "123.45", ... } ] } ] }
            if (response.data.code !== "0") {
                throw new Error(response.data.msg || 'Error fetching OKX balance');
            }
            const data = response.data.data;
            if (!data || !Array.isArray(data) || data.length === 0) {
                throw new Error("No balance data returned from OKX");
            }
            // Find the details for USDT.
            const balanceDetail = data[0].details.find(d => d.ccy === "USDT");
            return balanceDetail ? parseFloat(balanceDetail.availBal) : 0;
        } catch (error) {
            console.error('[OKXWS] Error fetching balance:', error.response?.data || error.message);
            throw error;
        }
    }

    async getHistoricalBalance(account, timestamp) {
        return this.getBalance(account);
    }
}

module.exports = new OKXWS();
