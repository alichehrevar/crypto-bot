// app/services/BinanceWS.js

const WebSocket = require('ws');
const axios     = require('axios');
const crypto    = require('crypto'); // for signature generation
const Candle    = require('../models/Candle');
const BotBase   = require('../models/BotBase');       // updated: use the discriminator‐based model
const wsServer  = require('./WebSocketServer');
const BotService = require('./botService/BotService');
// If you ever want to use TradingViewWS instead, you can uncomment:
// const tradingViewWS = require('./TradingViewWS');

class BinanceWS {
    constructor() {
        this.ws = null;
        this.base = 'https://api.binance.com';
    }

    _sign(params, secret) {
        const query = new URLSearchParams(params).toString();
        const signature = crypto.createHmac('sha256', secret).update(query).digest('hex');
        return query + '&signature=' + signature;
    }


    connect() {
        // Connect to Binance's miniTicker stream (all-symbol 1m updates).
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
            // 1) Fetch all active bots from the database, grab their symbols (e.g. "BTC/USDT").
            const activeBots = await BotBase.find({ active: true }).select('symbol').lean();
            const activeSymbolsSet = new Set(
                activeBots.map(bot => bot.symbol.toUpperCase())
            );

            // 2) Process each ticker in parallel
            await Promise.all(
                tickers.map(async (ticker) => {
                    try {
                        // Ensure all required fields exist
                        if (
                            !ticker.s || // symbol
                            !ticker.o || // open
                            !ticker.h || // high
                            !ticker.l || // low
                            !ticker.c || // close
                            !ticker.v || // volume
                            !ticker.E    // eventTime
                        ) {
                            console.warn(`Ticker data missing required fields: ${JSON.stringify(ticker)}`);
                            return;
                        }

                        // Normalize the symbol from Binance (e.g. "BTCUSDT" → "BTC/USDT")
                        let symbol;
                        const upperTickerSymbol = ticker.s.toUpperCase();
                        if (upperTickerSymbol.endsWith('USDT')) {
                            symbol = `${upperTickerSymbol.slice(0, -4)}/USDT`;
                        } else if (upperTickerSymbol.endsWith('USDC')) {
                            symbol = `${upperTickerSymbol.slice(0, -4)}/USDC`;
                        } else {
                            // If it's some other pair (e.g. “ETHBTC”), you may want to split differently.
                            // For now, we assume “BASEQUOTE” and leave it uppercase.
                            symbol = upperTickerSymbol;
                        }
                        symbol = symbol.toUpperCase();

                        // If no active bot is watching this symbol, skip entirely
                        if (!activeSymbolsSet.has(symbol)) {
                            return;
                        }

                        // Build a 1m‐candle from this miniTicker data
                        const timestamp = new Date(ticker.E); // event time in ms
                        const timeframe = '1m';

                        // Upsert a Candle document with this timestamp window:
                        // → we look for any 1m‐candle whose timestamp is within [timestamp − 60s, timestamp)
                        const candle = await Candle.findOneAndUpdate(
                            {
                                symbol,
                                timeframe,
                                timestamp: {
                                    $gte: new Date(timestamp.getTime() - 60000),
                                    $lt:  timestamp
                                }
                            },
                            {
                                // If inserting new:
                                $setOnInsert: {
                                    symbol,
                                    timeframe,
                                    timestamp,
                                    open:   parseFloat(ticker.o),
                                    volume: parseFloat(ticker.v),
                                    isClosed: ticker.x  // whether this tick closes the candle
                                },
                                // Always update high/low/close
                                $set: {
                                    high:    Math.max(parseFloat(ticker.h), parseFloat(ticker.o)),
                                    low:     Math.min(parseFloat(ticker.l), parseFloat(ticker.o)),
                                    close:   parseFloat(ticker.c),
                                    isClosed: ticker.x
                                }
                            },
                            {
                                upsert: true,
                                new:    true,
                                sort:   { timestamp: -1 }
                            }
                        );

                        // Broadcast the updated/inserted candle to all connected WebSocket clients
                        wsServer.broadcastCandle({
                            symbol:    candle.symbol,
                            timeframe: candle.timeframe,
                            timestamp: candle.timestamp,
                            open:      candle.open,
                            high:      candle.high,
                            low:       candle.low,
                            close:     candle.close,
                            volume:    candle.volume
                        });

                        // (Optional) If you want to broadcast to TradingViewWS:
                        // tradingViewWS.broadcastCandleUpdate({
                        //   symbol: candle.symbol,
                        //   timeframe: candle.timeframe,
                        //   candle
                        // });

                        // Finally, let BotService handle this new candle (it will route to any bots using it)
                        await BotService.processCandle(candle.symbol, candle.timeframe, candle);
                    }
                    catch (error) {
                        console.error(`Error processing ticker ${ticker.s}:`, error);
                    }
                })
            );
        } catch (error) {
            console.error('Global ticker processing error:', error);
        }
    }

    /**
     * Get the USDT balance for a Binance account via REST.
     *
     * @param {Object} account  - Must contain { apiKey, secretKey }.
     * @returns {Promise<number>} - Free USDT balance.
     */
    async getBalance(account) {
        const { apiKey, secretKey } = account;
        const timestamp = Date.now();
        const queryString = `timestamp=${timestamp}`;
        const signature = crypto
            .createHmac('sha256', secretKey)
            .update(queryString)
            .digest('hex');
        const endpoint = `https://api.binance.com/api/v3/account?${queryString}&signature=${signature}`;

        try {
            const response = await axios.get(endpoint, {
                headers: { 'X-MBX-APIKEY': apiKey }
            });
            const balances = response.data.balances;
            const usdt = balances.find(b => b.asset === 'USDT');
            return usdt ? parseFloat(usdt.free) : 0;
        } catch (err) {
            console.error('BinanceWS getBalance error:', err.response?.data || err.message);
            throw err;
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    async getHistoricalBalance(account, timestamp) {
        // snapshots are in millis, we ask for SPOT snapshot nearest that time:
        const { apiKey, secretKey } = account;
        const params = {
            type: 'SPOT',
            startTime: timestamp,
            endTime:   timestamp,
            limit:     1,
            recvWindow: 60000,
            timestamp: Date.now()
        };
        const qs = this._sign(params, secretKey);
        const resp = await axios.get(
            `${this.base}/sapi/v1/accountSnapshot?${qs}`,
            { headers: { 'X-MBX-APIKEY': apiKey } }
        );
        // pick the first snapshotVos entry
        const snap = resp.data.snapshotVos?.[0]?.data?.balances || [];
        // normalize to { asset, free, locked }
        return snap.map(b => ({
            asset:  b.asset,
            free:   parseFloat(b.free),
            locked: parseFloat(b.locked)
        }));
    }
}

module.exports = new BinanceWS();
