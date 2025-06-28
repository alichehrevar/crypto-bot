// app/strategies/optimization/OptimizationManager.js - REVISED

// Import the individual optimization methods.
const { optimizeGrid } = require('./OptimizeGrid');
const { optimizeBayesian } = require('./OptimizeBayesian');
const BestIndicatorsTable = require('../../../utils/BestIndicatorsTable');

// Map available optimization methods.
const methods = {
    grid: optimizeGrid,
    bayesian: optimizeBayesian,
};

/**
 * optimize
 *
 * Runs the specified optimization method on historical candle data to tune strategy parameters.
 * @param {String} symbol
 * @param {Array} indicators
 * @param {String} optimizationMethod
 * @param historicalCandles
 * @param options
 */
async function optimize(symbol, indicators, optimizationMethod, historicalCandles, options) {
    const key = (optimizationMethod || '').toString().trim().toLowerCase();
    const fn = methods[key] || methods.grid;
    // Pass ALL arguments along, including historicalCandles and options
    return fn(symbol, indicators, historicalCandles, options);
}

/**
 * getRecommendedIndicators
 *
 * Looks up and returns the best recommended technical indicators for a given market range and timeframe.
 * @param {string} range - Market range classification (e.g., "High Trend", "Near Random", "Reversal").
 * @param {string} timeframe - Trading timeframe (e.g., "1m", "5m", "1h", etc.).
 * @returns {Array<string>} An array of recommended indicator names.
 */
function getRecommendedIndicators(range, timeframe) {
    const key = `${range}|${timeframe}`;
    return BestIndicatorsTable[key] || [];
}

// Export a plain object containing the functions instead of a class instance.
module.exports = {
    optimize,
    getRecommendedIndicators,
};
