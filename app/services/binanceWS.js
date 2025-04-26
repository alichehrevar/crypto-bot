const WebSocket = require('ws');
const axios = require('axios');
const crypto = require('crypto'); // Import crypto for signature generation.
const Candle = require('../models/Candle');
const Bot = require('../../app/models/Bot'); // Import Bot model to check active deployed bots.
const wsServer = require('./WebSocketServer');
const BotService = require('./botService/BotService');
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
            // Fetch active bots from the database and create a set of symbols in normalized format.
            // We assume that in your database, bots store the symbol in the format "BASE/QUOTE" (e.g., "BTC/USDT")
            const activeBots = await Bot.find({ active: true }).select('symbol');
            const activeSymbolsSet = new Set(
                activeBots.map(bot => bot.symbol.toUpperCase())
            );

            await Promise.all(
                tickers.map(async (ticker) => {
                    try {
                        // Validate that necessary fields are present.
                        if (
                            !ticker.s ||
                            !ticker.o ||
                            !ticker.h ||
                            !ticker.l ||
                            !ticker.c ||
                            !ticker.v ||
                            !ticker.E
                        ) {
                            console.warn(`Ticker data missing required fields: ${JSON.stringify(ticker)}`);
                            return;
                        }

                        // Normalize the symbol from ticker.
                        let symbol = '';
                        const upperTickerSymbol = ticker.s.toUpperCase();
                        if (upperTickerSymbol.endsWith('USDT')) {
                            symbol = upperTickerSymbol.slice(0, -4) + '/USDT';
                        } else if (upperTickerSymbol.endsWith('USDC')) {
                            symbol = upperTickerSymbol.slice(0, -4) + '/USDC';
                        } else {
                            symbol = upperTickerSymbol;
                        }
                        symbol = symbol.toUpperCase();

                        // If this symbol is not among the active bot symbols, skip processing.
                        if (!activeSymbolsSet.has(symbol)) {
                            return;
                        }

                        const timestamp = new Date(ticker.E); // Binance event time
                        const timeframe = '1m'; // For demonstration, we treat each ticker as a 1m candle

                        // Upsert candle into your database.
                        const candle = await Candle.findOneAndUpdate(
                            {
                                symbol,
                                timeframe,
                                timestamp: {
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
                                    isClosed: ticker.x
                                },
                                $set: {
                                    high: Math.max(parseFloat(ticker.h), parseFloat(ticker.o)),
                                    low: Math.min(parseFloat(ticker.l), parseFloat(ticker.o)),
                                    close: parseFloat(ticker.c),
                                    isClosed: ticker.x
                                },
                            },
                            {
                                upsert: true,
                                new: true,
                                sort: { timestamp: -1 },
                            }
                        );

                        // Broadcast the updated candle to connected clients.
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

                        // Optionally, broadcast via TradingViewWS.
                        // tradingViewWS.broadcastCandleUpdate({...});

                        // pass it into your unified BotService:
                        await BotService.processCandle(candle.symbol, candle.timeframe, candle);

                    } catch (error) {
                        console.error(`Error processing ticker ${ticker.s}:`, error);
                    }
                })
            );
        } catch (error) {
            console.error('Global ticker processing error:', error);
        }
    }

    /**
     * Get the account balance for a Binance account using REST API.
     * @param {Object} account - The account object containing apiKey and secretKey.
     * @returns {Promise<number>} - The free USDT balance.
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
                headers: {
                    'X-MBX-APIKEY': apiKey,
                },
            });
            const balances = response.data.balances;
            const usdtBalance = balances.find(b => b.asset === 'USDT');
            return usdtBalance ? parseFloat(usdtBalance.free) : 0;
        } catch (error) {
            console.error('BinanceWS getBalance error:', error.response?.data || error.message);
            throw error;
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
