const WebSocket = require('ws');
const Candle = require('../models/Candle');
const tradingViewWS = require('./TradingViewWS'); // or your own broadcast service

class BingXWS {
    constructor() {
        this.ws = null;
        this.reconnectInterval = 5000;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.subscriptions = new Map(); // Track active subscriptions
    }

    /**
     * Connect to BingX WebSocket.
     * Make sure to use the correct endpoint per BingX docs (Spot vs. Perpetual).
     */
    connect() {
        if (this.ws) return; // Prevent multiple connections

        const apiKey = 'YOUR_API_KEY';
        const secretKey = 'YOUR_SECRET_KEY';
        const timestamp = Date.now();

        // Generate a signature
        const crypto = require('crypto');
        const signature = crypto
            .createHmac('sha256', secretKey)
            .update(`timestamp=${timestamp}`)
            .digest('hex');

        // Construct the WebSocket URL with query parameters
        const endpoint = `wss://open-api.bingx.com/ws?apiKey=${apiKey}&timestamp=${timestamp}&signature=${signature}`;

        this.ws = new WebSocket(endpoint);

        // Handle ping/pong
        this.ws.on('pong', () => console.debug('[BingXWS] Received pong'));
        setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.ping();
            }
        }, 30000);

        this.ws.on('open', () => {
            console.log('[BingXWS] Connected to BingX WebSocket');
            const subscribeMsg = {
                method: "SUBSCRIBE",
                params: ["btcusdt@kline_1m"],
                id: 1
            };
            this.ws.send(JSON.stringify(subscribeMsg));
        });

        this.ws.on('message', async (data) => {
            try {
                const message = JSON.parse(data);
                await this.processMessage(message);
            } catch (error) {
                console.error('[BingXWS] Message processing error:', error);
            }
        });

        this.ws.on('error', (err) => {
            console.error('[BingXWS] WebSocket error:', err);
        });

        this.ws.on('close', (code, reason) => {
            console.warn(`[BingXWS] Connection closed with code ${code}: ${reason}`);
            this.handleReconnect();
        });
    }

    handleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[BingXWS] Max reconnect attempts reached');
            return;
        }

        setTimeout(() => {
            this.reconnectAttempts++;
            console.log(`[BingXWS] Reconnect attempt ${this.reconnectAttempts}`);
            this.connect();
        }, this.reconnectInterval * Math.pow(2, this.reconnectAttempts));
    }

    /**
     * Process incoming messages from BingX.
     * The structure here depends heavily on actual BingX responses.
     */
    async processMessage(msg) {
        try {
            if (!msg?.dataType === 'kline' || !msg.data) return;

            const { symbol: rawSymbol, interval, open, high, low, close, volume } = msg.data;

            // Validate numeric values
            const isValid = [open, high, low, close, volume].every(Number.isFinite);
            if (!isValid) {
                console.warn('Invalid candle data:', msg);
                return;
            }

            const symbol = rawSymbol.replace('-', '/');
            const timeframe = this.mapInterval(interval);

            // Validate timeframe mapping
            if (!timeframe) {
                console.warn('Unmapped interval:', interval);
                return;
            }
        } catch (error) {
            console.error('Message processing failed:', error);
        }
    }

    /**
     * A helper to convert BingX intervals to your app's standard e.g. "1" -> "1m"
     */
    mapInterval(interval) {
        const mapping = {
            '1': '1m', '5': '5m', '15': '15m', '30': '30m',
            '60': '1h', '240': '4h', 'D': '1d', 'W': '1w'
        };

        if (!mapping[interval]) {
            console.warn('Unknown interval:', interval);
            return null;
        }

        return mapping[interval];
    }

    unmapInterval(timeframe) {
        const inverseMapping = {
            '1m': '1', '5m': '5', '15m': '15', '30m': '30',
            '1h': '60', '4h': '240', '1d': 'D', '1w': 'W'
        };

        return inverseMapping[timeframe] || timeframe;
    }

    /**
     * Upsert the candle into MongoDB for symbol/timeframe/timestamp
     */
    async upsertCandle(candleData) {
        try {
            await Candle.updateOne(
                {
                    symbol: candleData.symbol,
                    timeframe: candleData.timeframe,
                    timestamp: {
                        $gte: new Date(candleData.timestamp - 60000), // 1 min window
                        $lt: candleData.timestamp
                    }
                },
                {
                    $set: {
                        open: candleData.open,
                        high: { $max: ['$high', candleData.high] },
                        low: { $min: ['$low', candleData.low] },
                        close: candleData.close,
                        volume: { $sum: ['$volume', candleData.volume] }
                    }
                },
                { upsert: true }
            );
        } catch (err) {
            console.error('Candle upsert failed:', err);
        }
    }

    // Add subscription tracking
    subscribe(symbol, interval) {
        const key = `${symbol}-${interval}`;
        if (!this.subscriptions.has(key)) {
            this.subscriptions.set(key, { symbol, interval });

            const subscribeMsg = {
                dataType: "kline",
                symbol: symbol.replace('/', '-'),
                interval: this.unmapInterval(interval)
            };

            this.sendWhenReady(subscribeMsg);
        }
    }

    sendWhenReady(message) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            setTimeout(() => this.sendWhenReady(message), 100);
        }
    }
}

module.exports = new BingXWS();
