// utils/CandleCountThresholds.js
/**
 * Defines the number of candles required for each timeframe before triggering a dynamic update.
 */
const CandleCountThresholds = {
    "1m": 30,
    "5m": 23,
    "15m": 15,
    "30m": 13,
    "1h": 10,
    "4h": 8,
    "1d": 5
};

/**
 * Returns the candle count threshold for the given timeframe.
 * @param {string} timeframe - Trading timeframe (e.g., "1m", "1h").
 * @returns {number} The number of candles required.
 */
function getThresholdForTimeframe(timeframe) {
    return CandleCountThresholds[timeframe] || Infinity;
}

module.exports = {
    getThresholdForTimeframe
};
