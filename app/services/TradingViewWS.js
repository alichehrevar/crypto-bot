// TradingViewWS.js
const WebSocket = require('ws');

/**
 * TradingViewWS
 *
 * A simple subscription-based WebSocket server where clients
 * can subscribe/unsubscribe to candles for a particular symbol/timeframe
 * and receive real-time updates.
 */
class TradingViewWS {
    constructor() {
        this.wss = null;
        // Map key => Set of client sockets
        // key format: "BTC/USDT-1m" or "ETH/USDT-5m"
        this.subscriptions = new Map();
    }

    /**
     * Starts the WebSocket server.
     * You can pass an existing HTTP/S server or a port number directly.
     *
     * Example usage in your main server:
     *     const server = http.createServer(app);
     *     tradingViewWS.startServer(server);
     *     server.listen(3000, () => console.log('HTTP + WS on port 3000'));
     */
    startServer(server) {
        // If 'server' is a port number, you can do:
        //   this.wss = new WebSocket.Server({ port: server });
        // otherwise if 'server' is an existing HTTP server:
        this.wss = new WebSocket.Server({ server });

        console.log('TradingView WebSocket Server started.');

        this.wss.on('connection', (ws) => {
            console.log('New WS client connected');

            ws.on('message', (message) => {
                // Expect JSON messages like:
                // { action: "subscribe", symbol: "BTC/USDT", timeframe: "1m" }
                // { action: "unsubscribe", symbol: "BTC/USDT", timeframe: "1m" }
                let data;
                try {
                    data = JSON.parse(message);
                } catch (error) {
                    console.error('Invalid JSON from client:', error);
                    return;
                }

                if (!data.action || !data.symbol || !data.timeframe) {
                    console.log('Invalid subscription request:', data);
                    return;
                }

                const key = `${data.symbol}-${data.timeframe}`;

                if (data.action === 'subscribe') {
                    // Add this ws to the set of subscribers for that symbol/timeframe
                    if (!this.subscriptions.has(key)) {
                        this.subscriptions.set(key, new Set());
                    }
                    this.subscriptions.get(key).add(ws);
                    console.log(`Client subscribed to ${key}`);
                } else if (data.action === 'unsubscribe') {
                    // Remove this ws from that subscription set
                    if (this.subscriptions.has(key)) {
                        this.subscriptions.get(key).delete(ws);
                        console.log(`Client unsubscribed from ${key}`);
                    }
                }
            });

            ws.on('close', () => {
                // Remove ws from all subscriptions when the client disconnects
                for (const [key, clientSet] of this.subscriptions.entries()) {
                    if (clientSet.has(ws)) {
                        clientSet.delete(ws);
                    }
                }
                console.log('WS client disconnected');
            });
        });
    }

    /**
     * Broadcast a candle update to all clients subscribed
     * to "symbol-timeframe".
     *
     * Example usage in your binanceWS (or wherever you have new candle data):
     *     tradingViewWS.broadcastCandleUpdate({
     *       symbol: "BTC/USDT",
     *       timeframe: "1m",
     *       timestamp: Date,
     *       open: 12345.67,
     *       high: 12350.00,
     *       low: 12340.00,
     *       close: 12348.90,
     *       volume: 100.5
     *     });
     */
    broadcastCandleUpdate(candle) {
        const key = `${candle.symbol}-${candle.timeframe}`;
        const clients = this.subscriptions.get(key);

        if (!clients || clients.size === 0) {
            // Nobody is subscribed to this symbol/timeframe
            return;
        }

        // Build the payload
        const updatePayload = {
            action: 'candle_update',
            symbol: candle.symbol,
            timeframe: candle.timeframe,
            timestamp: candle.timestamp,  // or candle.timestamp.getTime() if you prefer
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            volume: candle.volume
        };

        const msg = JSON.stringify(updatePayload);
        // Broadcast to all subscribed clients
        for (const ws of clients) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(msg);
            }
        }
    }
}

module.exports = new TradingViewWS();
