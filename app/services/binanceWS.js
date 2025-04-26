// app/services/binanceWS.js
const WebSocket = require('ws');
const axios = require('axios');
const crypto = require('crypto');
const Candle = require('../models/Candle');
const Bot = require('../models/Bot');
const wsServer = require('./WebSocketServer');
const BotService = require('./botService/BotService');

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
            } catch (err) {
                console.error('WS message processing error:', err);
            }
        });

        this.ws.on('error', (err) => {
            console.error('WebSocket error:', err);
        });
    }

    async processTickers(tickers) {
        // 1) find which symbols have active bots
        const active = await Bot.find({ active: true }).select('symbol');
        const activeSet = new Set(active.map(b => b.symbol.toUpperCase()));

        await Promise.all(tickers.map(async t => {
            try {
                if (!t.s || !t.o || !t.h || !t.l || !t.c || !t.v || !t.E) return;

                // 2) normalize ticker symbol
                let sym = t.s.toUpperCase();
                if (sym.endsWith('USDT')) sym = sym.slice(0, -4) + '/USDT';
                else if (sym.endsWith('USDC')) sym = sym.slice(0, -4) + '/USDC';

                if (!activeSet.has(sym)) return;           // skip if no bot cares
                const timeframe = '1m';
                const ts = new Date(t.E);

                // 3) upsert candle (includes `isClosed` = t.x from Binance)
                const candle = await Candle.findOneAndUpdate(
                    {
                        symbol: sym, timeframe,
                        timestamp: { $gte: new Date(ts - 60000), $lt: ts }
                    },
                    {
                        $setOnInsert: {
                            open: parseFloat(t.o),
                            volume: parseFloat(t.v),
                            symbol: sym,
                            timeframe,
                            timestamp: ts
                        },
                        $set: {
                            high: Math.max(parseFloat(t.h), parseFloat(t.o)),
                            low:  Math.min(parseFloat(t.l), parseFloat(t.o)),
                            close: parseFloat(t.c),
                            isClosed: t.x
                        }
                    },
                    { upsert: true, new: true, sort: { timestamp: -1 } }
                );

                // 4) broadcast
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

                // 5) pull last N candles for your longest indicator
                const LOOKBACK = 100; // or derive from your longest period
                const recent = await Candle.find({ symbol: sym, timeframe })
                    .sort({ timestamp: -1 })
                    .limit(LOOKBACK)
                    .lean();
                // reverse into chronological order:
                recent.reverse();

                // 6) feed into your single BotService
                await BotService.processCandle(sym, timeframe, recent);

            } catch (err) {
                console.error(`Error processing ticker ${t.s}:`, err);
            }
        }));
    }

    /**
     * Get free USDT balance for a Binance account via REST.
     */
    async getBalance({ apiKey, secretKey }) {
        const timestamp = Date.now();
        const qs = `timestamp=${timestamp}`;
        const sig = crypto.createHmac('sha256', secretKey).update(qs).digest('hex');
        const url = `https://api.binance.com/api/v3/account?${qs}&signature=${sig}`;
        try {
            const res = await axios.get(url, { headers: { 'X-MBX-APIKEY': apiKey } });
            const usdt = res.data.balances.find(b => b.asset === 'USDT');
            return usdt ? parseFloat(usdt.free) : 0;
        } catch (err) {
            console.error('BinanceWS getBalance error:', err.response?.data || err);
            throw err;
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

module.exports = new BinanceWS();
