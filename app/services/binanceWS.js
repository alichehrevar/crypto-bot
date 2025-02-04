const WebSocket = require('ws');
const Candle = require('../models/Candle');
// If you renamed your broadcast service to tradingViewWS, import that instead:
// const tradingViewWS = require('./TradingViewWS');
const wsServer = require('./WebSocketServer');

class BinanceWS {
    constructor() {
        this.ws = null;
    }

    connect() {
        this.ws = new WebSocket('wss://stream.binance.com:9443/ws/!miniTicker@arr');

        this.ws.on('open', () => {
            console.log('Connected to Binance WebSocket');
        });

        this.ws.on('message', async (data) => {
            try {
                const tickers = JSON.parse(data);
                await this.processTickers(tickers);
            } catch (error) {
                console.error('WS message processing error:', error);
            }
        });

        this.ws.on('error', (err) => {
            console.error('WebSocket error:', err);
        });
    }

    async processTickers(tickers) {
        try {
            // Process all tickers in parallel
            await Promise.all(tickers.map(async (ticker) => {
                try {
                    // Example: if ticker.s = "BTCUSDT", we convert to "BTC/USDT"
                    const symbol = ticker.s.replace('USDT', '/USDT');
                    const timestamp = new Date(ticker.E);

                    // For demonstration, we treat everything as a 1m candle.
                    // This is a rough approach since miniTicker is not a full OHLC feed.
                    const timeframe = '1m';

                    // Upsert the "current" 1m candle
                    // We'll assume each event belongs to the minute that ends at `timestamp`
                    const candle = await Candle.findOneAndUpdate(
                        {
                            symbol,
                            timeframe,
                            timestamp: {
                                $gte: new Date(timestamp.getTime() - 60000), // within the last minute
                                $lt: timestamp
                            }
                        },
                        {
                            $setOnInsert: {
                                open: parseFloat(ticker.o),
                                volume: parseFloat(ticker.v),
                                symbol,
                                timeframe,
                                timestamp
                            },
                            $set: {
                                high: Math.max(parseFloat(ticker.h), parseFloat(ticker.o)),
                                low: Math.min(parseFloat(ticker.l), parseFloat(ticker.o)),
                                close: parseFloat(ticker.c)
                            }
                        },
                        {
                            upsert: true,
                            new: true,
                            sort: { timestamp: -1 }
                        }
                    );

                    // Broadcast updated candle to clients
                    // If you have a TradingViewWS, call tradingViewWS.broadcastCandleUpdate({...}).
                    // For now, we assume wsServer has a similar interface:
                    wsServer.broadcastCandle({
                        symbol: candle.symbol,
                        timeframe: candle.timeframe,
                        timestamp: candle.timestamp,
                        open: candle.open,
                        high: candle.high,
                        low: candle.low,
                        close: candle.close,
                        volume: candle.volume
                    });

                } catch (error) {
                    console.error(`Error processing ticker ${ticker.s}:`, error);
                }
            }));
        } catch (error) {
            console.error('Global ticker processing error:', error);
        }
    }
}

module.exports = new BinanceWS();
