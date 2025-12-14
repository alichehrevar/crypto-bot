// utils/candleStore.js

const Candle = require('../app/models/Candle'); // Import your Mongoose Model

// Maximum number of candles to store per symbol/timeframe in RAM.
const MAX_CANDLES = 100;

// Define timeframe durations in milliseconds.
const timeframeDurations = {
    '1m': 60000,
    '5m': 300000,
    '15m': 900000,
    '30m': 1800000,
    '1h': 3600000,
    '4h': 14400000,
    '1d': 86400000,
    '1w': 604800000,
};

// In-memory storage for candles, keyed by "SYMBOL-TIMEFRAME".
const candleStore = {};

/**
 * Determines if a candle is closed based on its timestamp and the timeframe.
 */
function isCandleClosed(candle, timeframe) {
    const duration = timeframeDurations[timeframe.toLowerCase()] || 60000;
    const candleTime = new Date(candle.timestamp).getTime();
    return Date.now() - candleTime >= duration;
}

/**
 * Update memory AND database safely.
 * Handles "Duplicate Key" race conditions gracefully.
 *
 * @param {string} symbol - e.g., "BTC/USDT"
 * @param {string} timeframe - e.g., "1m"
 * @param {Object} candle - Object including: timestamp, open, high, low, close, volume.
 */
async function updateCandle(symbol, timeframe, candle) {
    // 1. UPDATE IN-MEMORY STORE (Fast Access)
    const key = `${symbol.toUpperCase()}-${timeframe.toLowerCase()}`;
    if (!candleStore[key]) {
        candleStore[key] = [];
    }
    const candles = candleStore[key];

    // Determine isClosed flag
    candle.isClosed = isCandleClosed(candle, timeframe);

    // Update or Push to Memory
    const index = candles.findIndex(c => new Date(c.timestamp).getTime() === new Date(candle.timestamp).getTime());

    if (index !== -1) {
        candles[index] = candle;
    } else {
        candles.push(candle);
        if (candles.length > MAX_CANDLES) {
            candles.shift();
        }
    }

    // 2. UPDATE MONGODB (Persistence with Safety)
    try {
        const query = {
            symbol: symbol,
            timeframe: timeframe,
            timestamp: candle.timestamp
        };

        const update = {
            $set: {
                open: candle.open,
                high: candle.high,
                low: candle.low,
                close: candle.close,
                volume: candle.volume,
                isClosed: candle.isClosed
            }
        };

        // Try to update/insert
        await Candle.findOneAndUpdate(query, update, {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
        });

    } catch (error) {
        // ✅ CATCH RACE CONDITION ERROR (E11000)
        if (error.code === 11000) {
            // This happens if another process (Cron or WS) inserted the candle milliseconds ago.
            // We simply ignore it or do a standard update without upsert to ensure we have the latest close.
            // console.warn(`⚠️ Candle race handled for ${symbol} ${timeframe}`);

            // Optional: Force update the existing doc if needed
            try {
                await Candle.updateOne(
                    { symbol, timeframe, timestamp: candle.timestamp },
                    { $set: update.$set }
                );
            } catch (ignore) {}

        } else {
            // Log genuine DB errors
            console.error(`❌ DB Error updating candle ${symbol} ${timeframe}:`, error.message);
        }
    }
}

/**
 * Returns the latest N closed candles from MEMORY.
 */
function getLatestCandles(symbol, timeframe, count) {
    const key = `${symbol.toUpperCase()}-${timeframe.toLowerCase()}`;
    if (!candleStore[key]) return [];

    // Filter only closed candles & Sort
    const closedCandles = candleStore[key]
        .filter(c => c.isClosed)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return closedCandles.slice(-count);
}

module.exports = {
    updateCandle,
    getLatestCandles,
    candleStore
};
