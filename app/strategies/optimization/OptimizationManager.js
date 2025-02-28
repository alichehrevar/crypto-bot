// strategies/optimization/OptimizationManager.js

// Import our optimization methods.
const { optimizeGrid } = require('./OptimizeGrid');
const { optimizeBayesian } = require('./OptimizeBayesian');

/**
 * OptimizationManager
 *
 * Manages different optimization methods. Depending on the 'optimizationMethod' parameter,
 * it will call the corresponding optimization routine.
 */
class OptimizationManager {
    constructor() {
        // Map of available methods.
        this.methods = {
            grid: optimizeGrid,
            bayesian: optimizeBayesian,
            // Additional methods (e.g., ANN) could be added here.
        };
    }

    /**
     * optimize
     *
     * Runs the specified optimization method on historical data to tune strategy parameters.
     *
     * @param {String} symbol - Trading symbol (e.g., "BTC/USDT").
     * @param {String} timeframe - Trading timeframe (e.g., "1h").
     * @param {String} optimizationMethod - Method to use (e.g., "grid" or "bayesian").
     * @param {Array<Object>} historicalCandles - Historical candle data.
     * @returns {Promise<Object>} Optimized parameters.
     */
    async optimize(symbol, timeframe, optimizationMethod, historicalCandles) {
        if (this.methods[optimizationMethod]) {
            // For Bayesian optimization, our function returns a promise.
            return await this.methods[optimizationMethod](symbol, timeframe, historicalCandles);
        }
        console.warn(`Unknown optimization method "${optimizationMethod}", defaulting to grid`);
        return optimizeGrid(symbol, timeframe, historicalCandles);
    }
}

module.exports = new OptimizationManager();
