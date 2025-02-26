// strategies/optimization/OptimizationManager.js
/**
 * OptimizationManager.js
 *
 * This module manages optimization methods for risk parameters.
 * Currently, it supports grid search via the OptimizeGrid module.
 */

const { optimizeGrid } = require('./OptimizeGrid');

class OptimizationManager {
    constructor() {
        // Register available optimization methods.
        this.methods = {
            grid: optimizeGrid,
            // Other methods (bayesian, ann) can be added here in the future.
        };
    }

    /**
     * Optimizes parameters using the specified method.
     *
     * @param {String} symbol - Trading symbol (e.g., "BTC/USDT").
     * @param {String} timeframe - Trading timeframe (e.g., "1h").
     * @param {String} optimizationMethod - The method to use (e.g., "grid").
     * @param {Array} historicalCandles - An array of historical candle data.
     * @returns {Object} The optimized parameters.
     */
    optimize(symbol, timeframe, optimizationMethod, historicalCandles) {
        if (this.methods[optimizationMethod]) {
            return this.methods[optimizationMethod](symbol, timeframe, historicalCandles);
        }
        console.warn(`Unknown optimization method "${optimizationMethod}", defaulting to grid`);
        return this.methods['grid'](symbol, timeframe, historicalCandles);
    }
}

module.exports = new OptimizationManager();
