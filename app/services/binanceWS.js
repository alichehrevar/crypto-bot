const WebSocket = require('ws');
const Candle = require('../models/Candle');
const wsServer = require('./WebSocketServer');

class BinanceWS {
    constructor() {
        this.ws = null;
        this.subscriptions = new Set();
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
                    const symbol = ticker.s.replace('USDT', '/USDT');
                    const timestamp = new Date(ticker.E);

                    // Update or create candle in single operation
                    const candle = await Candle.findOneAndUpdate(
                        {
                            symbol,
                            timeframe: '1m',
                            timestamp: {
                                $gte: new Date(timestamp.getTime() - 60000), // 1 minute window
                                $lt: timestamp
                            }
                        },
                        {
                            $setOnInsert: { // Initial values for new candle
                                open: parseFloat(ticker.o),
                                volume: parseFloat(ticker.v),
                                symbol,
                                timeframe: '1m',
                                timestamp
                            },
                            $set: { // Update these fields for existing candle
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

                    // Broadcast updated candle
                    wsServer.broadcastCandle({
                        symbol: candle.symbol,
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
