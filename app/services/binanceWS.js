const WebSocket = require('ws');
const axios = require('axios');
const crypto = require('crypto'); // Import crypto for signature generation.
const Candle = require('../models/Candle');
const wsServer = require('./WebSocketServer');
const { updateBotDataFromCandle } = require('./botService/BotService');
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
            await Promise.all(
                tickers.map(async (ticker) => {
                    try {
                        // Validate that the necessary fields are present.
                        if (
                            !ticker.s ||
                            !ticker.o ||
                            !ticker.h ||
                            !ticker.l ||
                            !ticker.c ||
                            !ticker.v ||
                            !ticker.E
                        ) {
                            console.warn(
                                `Ticker data missing required fields: ${JSON.stringify(ticker)}`
                            );
                            return;
                        }

                        // Normalize the symbol:
                        // If the Binance symbol ends with 'USDT' or 'USDC', convert to the format "BASE/QUOTE".
                        let symbol = '';
                        const upperTickerSymbol = ticker.s.toUpperCase();
                        if (upperTickerSymbol.endsWith('USDT')) {
                            symbol = upperTickerSymbol.slice(0, -4) + '/USDT';
                        } else if (upperTickerSymbol.endsWith('USDC')) {
                            symbol = upperTickerSymbol.slice(0, -4) + '/USDC';
                        } else {
                            // Fallback: use the original symbol in uppercase.
                            symbol = upperTickerSymbol;
                        }

                        // Ensure symbol is in uppercase.
                        symbol = symbol.toUpperCase();

                        const timestamp = new Date(ticker.E); // Binance event time

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

                        // Optionally, broadcast via TradingViewWS:
                        // tradingViewWS.broadcastCandleUpdate({...});

                        // Update the corresponding bot's market information.
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
        // Build the query string with the required timestamp.
        const queryString = `timestamp=${timestamp}`;
        // Generate the HMAC SHA256 signature.
        const signature = crypto
            .createHmac('sha256', secretKey)
            .update(queryString)
            .digest('hex');
        // Binance REST endpoint to get account information.
        const endpoint = `https://api.binance.com/api/v3/account?${queryString}&signature=${signature}`;
        try {
            const response = await axios.get(endpoint, {
                headers: {
                    'X-MBX-APIKEY': apiKey,
                },
            });
            // Binance returns an object with a "balances" array.
            // Here we look for the free balance of USDT.
            const balances = response.data.balances;
            const usdtBalance = balances.find(b => b.asset === 'USDT');
            return usdtBalance ? parseFloat(usdtBalance.free) : 0;
        } catch (error) {
            console.error('BinanceWS getBalance error:', error.response?.data || error.message);
            throw error;
        }
    }

    // Additional existing methods remain unchanged...

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

module.exports = new BinanceWS();
