const WebSocket = require('ws');
const Candle = require('../models/Candle');
const tradingViewWS = require('./TradingViewWS'); // or your own broadcast service

class BingXWS {
    constructor() {
        this.ws = null;
    }

    /**
     * Connect to BingX WebSocket.
     * Make sure to use the correct endpoint per BingX docs (Spot vs. Perpetual).
     */
    connect() {
        // Example Spot endpoint from docs.
        // Verify you have the right one for your product (Spot or Perpetual).
        // Some BingX docs reference: wss://open-api.bingx.com/market
        // If you get "Unexpected server response: 200", it likely means
        // the URL or query params are incorrect for WebSocket usage.
        const endpoint = 'wss://open-api.bingx.com/market';

        this.ws = new WebSocket(endpoint);

        this.ws.on('open', () => {
            console.log('[BingXWS] Connected to BingX WebSocket');

            // Example subscription. The actual format depends on BingX docs.
            // If their doc says you must send something like:
            // { dataType: 'kline', symbol: 'BTC-USDT', interval: '1' }
            // then do so here.

            const subscribeMsg = {
                // The following is a *hypothetical* example:
                "dataType": "kline",       // or "kline_1m", "trade", etc.
                "symbol": "BTC-USDT",      // might be "BTC-USDT" or "BTCUSDT"
                "interval": "1",           // "1" for 1-minute? or "1m"?
                // Some docs say you might need "reqType": 1 or something else.
            };
            // Send subscription
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

        this.ws.on('close', () => {
            console.warn('[BingXWS] Connection closed. Attempting to reconnect...');
            // If you want auto-reconnect:
            setTimeout(() => this.connect(), 5000);
        });
    }

    /**
     * Process incoming messages from BingX.
     * The structure here depends heavily on actual BingX responses.
     */
    async processMessage(msg) {
        // Check if it's a Kline/candle event.  This example is *fictional*—adjust per docs.
        // You might see "topic": "kline_1m", or "dataType": "kline",
        // or a "k" field like Binance. Adapt accordingly.
        if (!msg || !msg.dataType) {
            // Possibly not a Kline update
            return;
        }

        if (msg.dataType === 'kline') {
            // Hypothetical structure
            // { dataType: 'kline', data: {
            //    symbol: "BTC-USDT",
            //    interval: "1",
            //    open: 12345.6,
            //    high: 12360.0,
            //    low: 12340.0,
            //    close: 12350.7,
            //    volume: 100.2,
            //    startTime: 1680000000000,
            //    closeTime: 1680000059999,
            //    isClosed: false
            // } }
            const klineData = msg.data;
            if (!klineData) return;

            const symbolRaw = klineData.symbol; // e.g. "BTC-USDT"
            const interval = klineData.interval; // e.g. "1"

            // Convert to "BTC/USDT" if you want consistent format
            const symbol = symbolRaw.replace('-', '/');

            const open = parseFloat(klineData.open);
            const high = parseFloat(klineData.high);
            const low = parseFloat(klineData.low);
            const close = parseFloat(klineData.close);
            const volume = parseFloat(klineData.volume);

            // Decide if you use startTime or closeTime for 'timestamp'
            // Possibly you do new Date(klineData.startTime)
            // or new Date(klineData.closeTime)
            const timestamp = new Date(klineData.closeTime);

            // Upsert the candle in your DB
            await this.upsertCandle({
                symbol,
                timeframe: this.mapInterval(interval), // might convert "1" -> "1m"
                timestamp,
                open,
                high,
                low,
                close,
                volume
            });

            // If you only want to broadcast once the candle is fully closed:
            // if (klineData.isClosed) {
            //     tradingViewWS.broadcastCandleUpdate({ ... });
            // }

            // Or broadcast partial:
            tradingViewWS.broadcastCandleUpdate({
                symbol,
                timeframe: this.mapInterval(interval),
                timestamp,
                open,
                high,
                low,
                close,
                volume
            });
        }
    }

    /**
     * A helper to convert BingX intervals to your app's standard e.g. "1" -> "1m"
     */
    mapInterval(interval) {
        // If BingX uses "1" for 1-minute, "5" for 5-minute, etc.
        // adapt them here:
        if (interval === '1') return '1m';
        if (interval === '5') return '5m';
        if (interval === '15') return '15m';
        // etc...
        return interval;
    }

    /**
     * Upsert the candle into MongoDB for symbol/timeframe/timestamp
     */
    async upsertCandle({ symbol, timeframe, timestamp, open, high, low, close, volume }) {
        try {
            await Candle.findOneAndUpdate(
                { symbol, timeframe, timestamp },
                {
                    $set: { open, high, low, close, volume }
                },
                { upsert: true, new: true }
            );
        } catch (err) {
            console.error('[BingXWS] upsertCandle error:', err);
        }
    }
}

module.exports = new BingXWS();
