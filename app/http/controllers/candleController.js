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

module.exports = {
    fetchHistoricalData,
    updateCandlesIfNeeded,
    getData
};
