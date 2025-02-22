/**
 * OptimizationManager.js
 *
 * This module manages different optimization methods.
 * Currently, it supports a grid search method.
 */

const { optimizeGrid } = require('./OptimizeGrid');

class OptimizationManager {
    constructor() {
        // Map available methods. More can be added later.
        this.methods = {
            grid: optimizeGrid,
            // bayesian: optimizeBayesian,  // future implementation
            // ann: optimizeANN,            // future implementation
        };
    }

    /**
     * Selects and executes an optimization method.
     *
     * @param {String} symbol - Trading symbol (e.g., "BTC/USDT").
     * @param {String} timeframe - Timeframe (e.g., "1h").
     * @param {String} optimizationMethod - The optimization method to use (e.g., "grid").
     * @param {Array} historicalCandles - Historical candle data.
     * @returns {Object} Optimized parameters.
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
