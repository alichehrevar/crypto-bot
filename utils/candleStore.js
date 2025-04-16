// utils/candleStore.js

// Maximum number of candles to store per symbol/timeframe.
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

/**
 * Determines if a candle is closed based on its timestamp and the timeframe.
 *
 * @param {Object} candle - The candle object. Must include a 'timestamp' property.
 * @param {string} timeframe - The timeframe (e.g., "1m", "1h").
 * @returns {boolean} True if the candle is considered closed.
 */
function isCandleClosed(candle, timeframe) {
    const duration = timeframeDurations[timeframe.toLowerCase()] || 60000; // default to 1m if unknown
    const candleTime = new Date(candle.timestamp).getTime();
    return Date.now() - candleTime >= duration;
}

// In-memory storage for candles, keyed by "SYMBOL-TIMEFRAME".
const candleStore = {};

/**
 * Update or add a candle for a given symbol and timeframe.
 * It sets the isClosed property on the candle based on the timeframe.
 *
 * @param {string} symbol - e.g., "BTC/USDT"
 * @param {string} timeframe - e.g., "1m"
 * @param {Object} candle - Object including at least: timestamp, open, high, low, close, volume.
 */
function updateCandle(symbol, timeframe, candle) {
    const key = `${symbol.toUpperCase()}-${timeframe.toLowerCase()}`;
    if (!candleStore[key]) {
        candleStore[key] = [];
    }
    const candles = candleStore[key];

    // Determine and attach isClosed flag using our helper:
    candle.isClosed = isCandleClosed(candle, timeframe);

    // Look for an existing candle with the same timestamp.
    const index = candles.findIndex(c => new Date(c.timestamp).getTime() === new Date(candle.timestamp).getTime());

    if (index !== -1) {
        candles[index] = candle;
    } else {
        candles.push(candle);
        if (candles.length > MAX_CANDLES) {
            candles.shift();
        }
    }
}

/**
 * Returns the latest N closed candles for a given symbol and timeframe.
 *
 * This function filters the stored candles to include only those that are closed.
 * It then returns the last "count" candles from that filtered list.
 *
 * @param {string} symbol - e.g., "BTC/USDT"
 * @param {string} timeframe - e.g., "1m"
 * @param {number} count - Number of closed candles to retrieve.
 * @returns {Array<Object>} An array of candle objects (may be less than count if not enough are available).
 */
function getLatestCandles(symbol, timeframe, count) {
    const key = `${symbol.toUpperCase()}-${timeframe.toLowerCase()}`;
    if (!candleStore[key]) return [];

    // Filter only closed candles.
    const closedCandles = candleStore[key].filter(c => c.isClosed).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Sort by timestamp (ascending).
    closedCandles.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Return only the latest `count` candles.
    return closedCandles.slice(-count);
}

module.exports = {
    updateCandle,
    getLatestCandles,
    candleStore // optional for debugging
};
