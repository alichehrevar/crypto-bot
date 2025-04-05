const WebSocket = require('ws');
const crypto = require('crypto');
const zlib = require('zlib');
const Candle = require('../models/Candle');

// For Node 18+ the global fetch API is available. If not, you may need to require node-fetch.
// const fetch = require('node-fetch');

class BingXWS {
    constructor() {
        this.ws = null;
        this.reconnectInterval = 5000;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.subscriptions = new Map();
        this.pingInterval = null;
        // Removed default credentials from environment.
        // this.apiKey = process.env.BINGX_API_KEY;
        // this.apiSecret = process.env.BINGX_API_SECRET;
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

        const timestamp = Date.now().toString();
        // When connecting, you'll need to supply the appropriate credentials.
        // For now, we leave the signature blank. Later, you can update this to pass the user's credentials.
        const signature = ''; // You might call: this.generateSignature(timestamp, userProvidedSecret)

        // BingX Perpetual Swap WebSocket endpoint with authentication.
        const endpoint = `wss://open-api-swap.bingx.com/swap-market`;

        this.ws = new WebSocket(endpoint, {
            perMessageDeflate: false // Disable compression if not needed.
        });

        // Set explicit binaryType.
        this.ws.binaryType = 'arraybuffer';

        // Set up ping interval.
        this.setupPingInterval();

        this.ws.on('open', () => {
            console.log('[BingXWS] Connected to BingX WebSocket');
            this.reconnectAttempts = 0;

            // Authenticate the connection.
            // Note: Remove default credentials; authentication should be done with user-provided values.
            // Example (to be implemented later):
            // this.authenticate(timestamp, signature, userProvidedApiKey);

            // Resubscribe to all active subscriptions.
            this.subscriptions.forEach((sub) => {
                this.sendSubscription(sub.symbol, sub.interval);
            });
        });

        this.ws.on('message', async (data, isBinary) => {
            try {
                let message;
                // Handle binary messages.
                if (isBinary) {
                    message = this.parseBinaryMessage(data);
                } else {
                    message = JSON.parse(data.toString());
                }

                // Handle ping messages.
                if (message.ping) {
                    this.handlePing(message.ping);
                    return;
                }

                // Handle authentication response.
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

    // Add binary message parser.
    parseBinaryMessage(data) {
        try {
            const decompressed = zlib.gunzipSync(data);
            return JSON.parse(decompressed.toString());
        } catch (error) {
            console.error('Binary message parsing failed:', error);
            return null;
        }
    }

    /**
     * Fetch the account balance from BingX using REST API.
     * @param {Object} account - The account object containing API credentials.
     * @returns {Promise<number>} The account balance.
     */
    async getBalance(account) {
        const { apiKey, secretKey } = account;
        const timestamp = Date.now().toString();
        
        // Correct signature generation for BingX according to their documentation
        const queryString = `timestamp=${timestamp}`;
        const signature = crypto
            .createHmac('sha256', secretKey)
            .update(queryString)
            .digest('hex');

        // Correct BingX API endpoint for spot account balance
        const endpoint = `https://open-api.bingx.com/openApi/spot/v1/account/balance?${queryString}&signature=${signature}`;

        const headers = {
            "Content-Type": "application/json",
            "X-BX-APIKEY": apiKey,
            "X-BX-SIGNATURE": signature,
            "X-BX-TIMESTAMP": timestamp
        };

        try {
            console.log('[BingXWS] Making balance request to:', endpoint);
            console.log('[BingXWS] Headers:', JSON.stringify(headers, null, 2));

            const res = await fetch(endpoint, { 
                method: "GET", 
                headers
            });
            
            const responseText = await res.text();
            console.log('[BingXWS] Raw response:', responseText);
            
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error('[BingXWS] Failed to parse response as JSON:', e);
                throw new Error(`Invalid JSON response: ${responseText}`);
            }
            
            if (!res.ok) {
                console.error('[BingXWS] API Error Response:', data);
                throw new Error(`BingX API error (${res.status}): ${data.msg || data.message || 'Unknown error'}`);
            }
            
            if (data.code !== 0) {
                console.error('[BingXWS] API Error Code:', data.code, 'Message:', data.msg);
                throw new Error(`BingX API error (${data.code}): ${data.msg || 'Unknown error'}`);
            }
            
            if (!data.data || !data.data.balances) {
                console.error('[BingXWS] Unexpected response format:', data);
                throw new Error('Unexpected response format from BingX API');
            }
            
            return data.data.balances;
        } catch (error) {
            console.error('[BingXWS] Error fetching balance:', error);
            console.error('[BingXWS] Error stack:', error.stack);
            throw new Error(`Failed to fetch BingX balance: ${error.message}`);
        }
    }
}

// Export a singleton instance.
module.exports = new BingXWS();
