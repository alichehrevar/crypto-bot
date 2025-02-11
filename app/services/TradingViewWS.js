// TradingViewWS.js
const WebSocket = require('ws');

/**
 * TradingViewWS
 *
 * A subscription-based WebSocket server where clients can subscribe/unsubscribe to candles
 * for a particular symbol/timeframe and receive real-time updates.
 */
class TradingViewWS {
    constructor() {
        // Create a WebSocket server instance in "noServer" mode.
        this.wss = new WebSocket.Server({ noServer: true });
        // Map to store subscriptions.
        // Key format: "BTC/USDT-1m" or "ETH/USDT-5m"
        this.subscriptions = new Map();

        // Setup connection handling.
        this.wss.on('connection', (ws, request) => {
            console.log('TradingViewWS: New WS client connected');

            ws.on('message', (message) => {
                let data;
                try {
                    data = JSON.parse(message);
                } catch (error) {
                    console.error('TradingViewWS: Invalid JSON from client:', error);
                    return;
                }

                if (!data.action || !data.symbol || !data.timeframe) {
                    console.log('TradingViewWS: Invalid subscription request:', data);
                    return;
                }

                const key = `${data.symbol}-${data.timeframe}`;

                if (data.action === 'subscribe') {
                    if (!this.subscriptions.has(key)) {
                        this.subscriptions.set(key, new Set());
                    }
                    this.subscriptions.get(key).add(ws);
                    console.log(`TradingViewWS: Client subscribed to ${key}`);
                } else if (data.action === 'unsubscribe') {
                    if (this.subscriptions.has(key)) {
                        this.subscriptions.get(key).delete(ws);
                        console.log(`TradingViewWS: Client unsubscribed from ${key}`);
                    }
                }
            });

            ws.on('close', () => {
                // Remove the ws from all subscription sets.
                for (const [key, clientSet] of this.subscriptions.entries()) {
                    if (clientSet.has(ws)) {
                        clientSet.delete(ws);
                    }
                }
                console.log('TradingViewWS: WS client disconnected');
            });
        });
    }

    /**
     * Upgrades an HTTP request to a WebSocket connection.
     *
     * @param {http.IncomingMessage} request
     * @param {net.Socket} socket
     * @param {Buffer} head
     */
    handleUpgrade(request, socket, head) {
        this.wss.handleUpgrade(request, socket, head, (ws) => {
            this.wss.emit('connection', ws, request);
        });
    }

    /**
     * Broadcast a candle update to all clients subscribed to a specific symbol/timeframe.
     *
     * @param {Object} candle - A candle object with symbol, timeframe, timestamp, open, high, low, close, volume.
     */
    broadcastCandleUpdate(candle) {
        const key = `${candle.symbol}-${candle.timeframe}`;
        const clients = this.subscriptions.get(key);
        if (!clients || clients.size === 0) return;

        const updatePayload = {
            action: 'candle_update',
            symbol: candle.symbol,
            timeframe: candle.timeframe,
            timestamp: candle.timestamp,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            volume: candle.volume,
        };

        const msg = JSON.stringify(updatePayload);
        for (const ws of clients) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(msg);
            }
        }
    }
}

module.exports = new TradingViewWS();
