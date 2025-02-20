/**
 * OptimizationManager.js
 *
 * This module manages different optimization methods.
 * Currently, it supports a grid search method.
 */

const { optimizeGrid } = require('./OptimizeGrid');

class OptimizationManager {
    constructor() {
        // We can add more methods (bayesian, ANN, etc.) later.
        this.methods = {
            grid: optimizeGrid,
            // bayesian: optimizeBayesian,   // future implementation
            // ann: optimizeANN              // future implementation
        };
    }

    /**
     * Selects and executes the optimization method.
     *
     * @param {String} symbol - Trading symbol.
     * @param {String} timeframe - Timeframe.
     * @param {String} optimizationMethod - The method to use ("grid", etc.).
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
