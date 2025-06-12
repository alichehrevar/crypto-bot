// strategies/optimization/OptimizationManager.js

// Import the individual optimization methods.
const {optimizeGrid} = require('./OptimizeGrid');
const {optimizeBayesian} = require('./OptimizeBayesian');

// Import the lookup table for recommended indicators.
// (Make sure the BestIndicatorsTable file is now located in your utils folder.)
const BestIndicatorsTable = require('../../../utils/BestIndicatorsTable');

/**
 * OptimizationManager
 *
 * This class manages various optimization methods for tuning trading strategy parameters.
 * It supports grid search and Bayesian optimization, and it provides recommended indicators
 * based on the market range (e.g., "High Trend", "Near Random", "Reversal") and timeframe.
 */
class OptimizationManager {
    constructor() {
        // Map available optimization methods.
        this.methods = {
            grid: optimizeGrid,
            bayesian: optimizeBayesian,
            // Additional optimization methods (e.g., ANN) can be added here.
        };
    }

    /**
     * optimize
     *
     * Runs the specified optimization method on historical candle data to tune strategy parameters.
     */
    /**
     * @param {String} symbol
     * @param {Array} indicators        ← now correctly named
     * @param {String} optimizationMethod
     * @param {Array} historicalCandles
     */
    async optimize(symbol, indicators, optimizationMethod, historicalCandles) {
        // normalize to lowercase so "Bayesian" or "grid" both work
        const key = (optimizationMethod || '')
            .toString()
            .trim()
            .toLowerCase();
        const fn = this.methods[key] || this.methods.grid;
        // pass along the real `indicators` array, not a bogus timeframe
        return fn(symbol, indicators, historicalCandles);
    }

    /**
     * getRecommendedIndicators
     *
     * Looks up and returns the best recommended technical indicators for a given market range and timeframe.
     * This helps in choosing the optimal indicator(s) based on market conditions.
     *
     * @param {string} range - Market range classification (e.g., "High Trend", "Near Random", "Reversal").
     * @param {string} timeframe - Trading timeframe (e.g., "1m", "5m", "1h", etc.).
     * @returns {Array<string>} An array of recommended indicator names.
     */
    getRecommendedIndicators(range, timeframe) {
        const key = `${range}|${timeframe}`;
        return BestIndicatorsTable[key] || [];
    }
}

// Export an instance of OptimizationManager.
module.exports = new OptimizationManager();
