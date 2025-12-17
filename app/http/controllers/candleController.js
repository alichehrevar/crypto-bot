const axios = require('axios');
const Candle = require('../../models/Candle');
const logger = require("../../../logs/logger");

async function fetchHistoricalData(req, res) {
    try {
        const { symbol, interval, limit = 100 } = req.body;

        // Ensure the symbol is in the correct format (e.g., "BTC/USDT" to "BTCUSDT")
        const binanceSymbol = symbol.replace('/', '');

        // Fetch historical data from Binance API
        const response = await axios.get('https://api.binance.com/api/v3/klines', {
            params: {
                symbol: binanceSymbol,
                interval,
                limit
            }
        });

        // Map the response data to the format used in our database.
        const candles = response.data.map(kline => ({
            symbol: symbol.toUpperCase(),
            open: parseFloat(kline[1]),
            high: parseFloat(kline[2]),
            low: parseFloat(kline[3]),
            close: parseFloat(kline[4]),
            volume: parseFloat(kline[5]),
            timeframe: interval,
            timestamp: new Date(kline[0]) // Convert timestamp to Date object
        }));

        // Delete any existing data for the given symbol and timeframe before inserting new data.
        await Candle.deleteMany({ symbol: symbol.toUpperCase(), timeframe: interval.toLowerCase() });

        // Insert the new candle data into the database.
        await Candle.insertMany(candles);

        res.json({
            success: true,
            count: candles.length,
            symbol,
            interval
        });

    } catch (error) {
        console.error('Binance API error:', error.response?.data || error.message);
        logger.error(`Binance API error: ${error.message}`, { stack: error.stack });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch historical data',
            details: error.response?.data || error.message
        });
    }
}

/**
 * updateCandlesIfNeeded
 *
 * Checks if the latest candle in the database for a given symbol/timeframe is outdated.
 * If it is (or if none exists), fetch the most recent candle from Binance's API and upsert it.
 *
 * @param {string} symbol - e.g. "BTC/USDT"
 * @param {string} timeframe - e.g. "1m", "1h"
 */
async function updateCandlesIfNeeded(symbol, timeframe) {
    // Find the most recent candle for the given symbol/timeframe.
    const latestCandle = await Candle.findOne({
        symbol: symbol.toUpperCase(),
        timeframe: timeframe.toLowerCase()
    }).sort({ timestamp: -1 });

    // Determine a freshness threshold based on the timeframe.
    let threshold = 60 * 1000; // default for 1m
    if (timeframe.endsWith('m')) {
        const minutes = parseInt(timeframe.slice(0, -1));
        threshold = minutes * 60 * 1000;
    } else if (timeframe.endsWith('h')) {
        const hours = parseInt(timeframe.slice(0, -1));
        threshold = hours * 60 * 60 * 1000;
    }
    // (Add additional cases for 'd', 'w', etc., if needed.)

    const now = Date.now();

    // If there's no candle or the latest candle is older than the threshold, update it.
    if (!latestCandle || now - latestCandle.timestamp.getTime() > threshold) {
        try {
            // Convert symbol from "BTC/USDT" to "BTCUSDT" as required by Binance.
            const binanceSymbol = symbol.replace('/', '');

            // Call Binance API to get the latest candle data.
            const response = await axios.get('https://api.binance.com/api/v3/klines', {
                params: {
                    symbol: binanceSymbol,
                    interval: timeframe,
                    limit: 1
                }
            });

            // Binance returns an array of arrays.
            // Format: [ openTime, open, high, low, close, volume, closeTime, ... ]
            const kline = response.data[0];
            if (!kline) {
                throw new Error('No candle data returned from Binance');
            }

            const newCandle = {
                symbol: symbol.toUpperCase(),
                timeframe: timeframe.toLowerCase(),
                timestamp: new Date(kline[0]),  // Convert kline[0] (milliseconds) to a Date.
                open: parseFloat(kline[1]),
                high: parseFloat(kline[2]),
                low: parseFloat(kline[3]),
                close: parseFloat(kline[4]),
                volume: parseFloat(kline[5]),
            };

            // Use findOneAndUpdate with upsert to update or insert the candle.
            await Candle.findOneAndUpdate(
                { symbol: symbol.toUpperCase(), timeframe: timeframe.toLowerCase(), timestamp: new Date(kline[0]) },
                { $set: newCandle },
                { upsert: true, new: true }
            );
            console.log(`Upserted candle for ${symbol} ${timeframe}`);
        } catch (error) {
            console.error('Error fetching live candle data:', error.message);
            logger.error(`Error fetching live candle data: ${error.message}`, { stack: error.stack });
        }
    }
}

/**
 * getData - Returns the latest candles for a given symbol and timeframe.
 *
 * First, it calls updateCandlesIfNeeded to update the database if needed,
 * then it fetches the latest 100 candles.
 */
async function getData(req, res) {
    try {
        const { symbol, timeframe } = req.params;
        await updateCandlesIfNeeded(symbol, timeframe);
        const candles = await Candle.find({
            symbol: symbol.toUpperCase(),
            timeframe: timeframe.toLowerCase()
        }).sort({ timestamp: -1 }).limit(100);
        res.json({
            success: true,
            count: candles.length,
            data: candles
        });
    } catch (error) {
        console.error('Get candles error:', error);
        logger.error(`Get candles error: ${error.message}`, { stack: error.stack });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch candles'
        });
    }
}

/**
 * Proxies K-line (candlestick) data requests to external exchanges.
 * This resolves frontend CORS issues and centralizes API logic.
 */
async function proxyKlines (req, res){

    // 1. Extract query parameters from the frontend request
    const { exchange, symbol, interval, category } = req.query;

    if (!exchange || !symbol || !interval || !category) {
        return res.status(400).json({ message: 'Missing required parameters: exchange, symbol, interval, category' });
    }

    let externalApiUrl;
    let apiSymbol = symbol;

    try {
        // 2. Build the correct API URL and format the symbol based on the exchange
        switch (exchange) {
            case 'Binance':
                if (category === 'Perpetual' || category === 'USDT-M') {
                    apiSymbol = symbol.toUpperCase().replace(/[\/]?PERP/, 'USDT');
                    externalApiUrl = `https://fapi.binance.com/fapi/v1/klines?symbol=${apiSymbol}&interval=${interval}&limit=1000`;
                } else {
                    apiSymbol = symbol.replace('/', '');
                    externalApiUrl = `https://api.binance.com/api/v3/klines?symbol=${apiSymbol}&interval=${interval}&limit=1000`;
                }
                break;

            case 'BingX':
                console.log(exchange)
                if (category === 'Perpetual' || category === 'USDT-M') {
                    apiSymbol = symbol.toUpperCase().replace(/[\/]?PERP/, '-USDT');
                } else {
                    apiSymbol = symbol.replace('/', '-'); // Assuming Spot might also need formatting
                }
                externalApiUrl = `https://open-api.bingx.com/openApi/swap/v3/quote/klines?symbol=${apiSymbol}&interval=${interval}&limit=1000`;
                break;

            case 'OKX':
                // OKX uses 'bar' for interval and doesn't need symbol transformation
                const intervalMap = { '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m', '1h': '1H', '4h': '4H', '1d': '1D' };
                const bar = intervalMap[interval] || '1m';
                externalApiUrl = `https://www.okx.com/api/v5/market/candles?instId=${symbol}&bar=${bar}&limit=300`;
                break;

            default:
                return res.status(400).json({ message: 'Unsupported exchange' });
        }

        // 3. Call the external API and forward the response
        const response = await axios.get(externalApiUrl);

        // Special handling for OKX data which is newest first
        if (exchange === 'OKX' && response.data.data) {
            response.data.data.reverse();
        }

        return res.status(200).json(response.data);

    } catch (error) {
        logger.error(`[PROXY ERROR for ${exchange}]:`, error.response ? error.response.data : error.message);
        console.error(`[PROXY ERROR for ${exchange}]:`, error.response ? error.response.data : error.message);
        const status = error.response ? error.response.status : 500;
        const message = error.response ? error.response.data : 'Internal server error';
        return res.status(status).json({ message: 'Failed to fetch data from exchange', error: message });
    }
}

module.exports = {
    fetchHistoricalData,
    updateCandlesIfNeeded,
    proxyKlines,
    getData
};
