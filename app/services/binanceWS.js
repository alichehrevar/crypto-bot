const WebSocket = require('ws');
const Candle = require('../models/Candle');

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
        for (const ticker of tickers) {
            const symbol = ticker.s.replace('USDT', '/USDT');
            const candle = await Candle.findOneAndUpdate(
                {
                    symbol,
                    timeframe: '1m',
                    timestamp: new Date(ticker.E)
                },
                {
                    $setOnInsert: {
                        open: parseFloat(ticker.o),
                        high: parseFloat(ticker.h),
                        low: parseFloat(ticker.l),
                        close: parseFloat(ticker.c),
                        volume: parseFloat(ticker.v)
                    }
                },
                {
                    upsert: true,
                    new: true
                }
            );
        }
    }
}

module.exports = new BinanceWS();
