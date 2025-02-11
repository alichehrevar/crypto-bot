const WebSocket = require('ws');
const axios = require('axios');
const Candle = require('../models/Candle');
const wsServer = require('./WebSocketServer');
const { updateBotDataFromCandle } = require('./botService');
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
                    const symbol = ticker.s.endsWith('USDT')
                        ? ticker.s.slice(0, -4) + '/USDT'
                        : ticker.s;  // Fallback if different format

                    const timestamp = new Date(ticker.E);  // Binance event time
                    // For demonstration purposes, we treat every ticker as a 1m candle.
                    const timeframe = '1m';

                    // Upsert the current candle for the current minute.
                    const candle = await Candle.findOneAndUpdate(
                        {
                            symbol,
                            timeframe,
                            timestamp: {
                                // We consider candles that have an open time in the last minute.
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

                    // Broadcast the updated candle to clients via the general WebSocket server.
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

                    // Optionally, you can broadcast via TradingViewWS:
                    // tradingViewWS.broadcastCandleUpdate({
                    //   symbol: candle.symbol,
                    //   timeframe: candle.timeframe,
                    //   timestamp: candle.timestamp,
                    //   open: candle.open,
                    //   high: candle.high,
                    //   low: candle.low,
                    //   close: candle.close,
                    //   volume: candle.volume,
                    // });

                    // Update the corresponding bot's market information with the new candle.
                    await updateBotDataFromCandle({
                        symbol: candle.symbol,
                        timeframe: candle.timeframe,
                        timestamp: candle.timestamp,
                        open: candle.open,
                        high: candle.high,
                        low: candle.low,
                        close: candle.close,
                        volume: candle.volume,
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
