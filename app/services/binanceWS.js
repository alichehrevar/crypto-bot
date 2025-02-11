// BinanceWS.js
const WebSocket = require('ws');
const axios = require('axios');
const Candle = require('../models/Candle');
const wsServer = require('./WebSocketServer');
// Uncomment the next line if you wish to use TradingViewWS instead for broadcasting updates.
// const tradingViewWS = require('./TradingViewWS');

class BinanceWS {
    constructor() {
        this.ws = null;
    }

    connect() {
        // Connect to Binance's miniTicker stream.
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
            await Promise.all(tickers.map(async (ticker) => {
                try {
                    // Validate that the necessary fields are present.
                    if (!ticker.s || !ticker.o || !ticker.h || !ticker.l || !ticker.c || !ticker.v || !ticker.E) {
                        console.warn(`Ticker data missing required fields: ${JSON.stringify(ticker)}`);
                        return;
                    }

                    // Convert Binance symbol (e.g. "BTCUSDT") to "BTC/USDT".
                    // Here, we assume the pair is always against USDT.
                    const symbol = ticker.s.endsWith('USDT')
                        ? ticker.s.slice(0, -4) + '/USDT'
                        : ticker.s;  // Fallback if different format

                    const timestamp = new Date(ticker.E);  // Binance event time

                    // For demonstration purposes, we treat every ticker as a 1m candle.
                    // (miniTicker doesn't provide full OHLC data; you'll likely need a more robust solution for production.)
                    const timeframe = '1m';

                    // Upsert the current candle: find a candle for the same symbol, timeframe, and the current minute.
                    const candle = await Candle.findOneAndUpdate(
                        {
                            symbol,
                            timeframe,
                            timestamp: {
                                // Assuming candle timestamps represent the open time of the candle,
                                // we consider candles in the last minute.
                                $gte: new Date(timestamp.getTime() - 60000),
                                $lt: timestamp,
                            },
                        },
                        {
                            $setOnInsert: {
                                open: parseFloat(ticker.o),
                                volume: parseFloat(ticker.v),
                                symbol,
                                timeframe,
                                timestamp,
                            },
                            $set: {
                                high: Math.max(parseFloat(ticker.h), parseFloat(ticker.o)),
                                low: Math.min(parseFloat(ticker.l), parseFloat(ticker.o)),
                                close: parseFloat(ticker.c),
                            },
                        },
                        {
                            upsert: true,
                            new: true,
                            sort: { timestamp: -1 },
                        }
                    );

                    // Broadcast the updated candle to clients.
                    // You can choose to broadcast via your generic WS server:
                    wsServer.broadcastCandle({
                        symbol: candle.symbol,
                        timeframe: candle.timeframe,
                        timestamp: candle.timestamp,
                        open: candle.open,
                        high: candle.high,
                        low: candle.low,
                        close: candle.close,
                        volume: candle.volume,
                    });

                    // Or, if you prefer, use your TradingViewWS service:
                    // tradingViewWS.broadcastCandleUpdate({
                    //     symbol: candle.symbol,
                    //     timeframe: candle.timeframe,
                    //     timestamp: candle.timestamp,
                    //     open: candle.open,
                    //     high: candle.high,
                    //     low: candle.low,
                    //     close: candle.close,
                    //     volume: candle.volume,
                    // });

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
