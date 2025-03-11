// strategies/DynamicStrategy.js
const Candle = require('../models/Candle');
const OptimizationManager = require('./optimization/OptimizationManager');
const { getThresholdForTimeframe } = require('../../utils/CandleCountThresholds');

class DynamicStrategy {
    /**
     * Wraps a base strategy to enable dynamic parameter updates.
     * @param {object} baseStrategy - An instance of an indicator strategy (e.g., RSI, MACD, etc.)
     * @param {object} initialConfig - The initial configuration parameters.
     * @param {string} symbol - Trading symbol, e.g., "BTC/USDT"
     * @param {string} timeframe - Timeframe, e.g., "1h"
     * @param {number} updateIntervalMs - How often (in ms) to re‑evaluate parameters.
     */
    constructor(baseStrategy, initialConfig, symbol, timeframe, updateIntervalMs = 60000) {
        this.baseStrategy = baseStrategy;
        this.config = initialConfig;
        this.symbol = symbol;
        this.timeframe = timeframe;
        this.lastUpdateTime = Date.now();

        // Start dynamic parameter updates.
        this.startDynamicUpdates(updateIntervalMs);
    }

    /**
     * Proxy for calculating a signal using the base strategy.
     * @param {Array} candles - An array of candle data.
     * @returns {string} The trading signal ('BUY', 'SELL', or 'HOLD').
     */
    calculateSignal(candles) {
        return this.baseStrategy.calculateSignal(candles);
    }

    /**
     * Periodically re-optimizes the strategy parameters based on recent candle data.
     * It checks if the number of recent candles reaches the threshold defined for the timeframe.
     * If yes, it uses the OptimizationManager to update its configuration.
     *
     * @param {number} intervalMs - The interval in milliseconds to check for updates.
     */
    startDynamicUpdates(intervalMs) {
        setInterval(async () => {
            try {
                // Fetch recent candle data for the given symbol/timeframe.
                const recentCandles = await this.fetchRecentCandles();

                // Get the required number of candles for this timeframe.
                const threshold = getThresholdForTimeframe(this.timeframe.toLowerCase());

                // If we haven't reached the threshold, skip reoptimization.
                if (recentCandles.length < threshold) {
                    console.log(`DynamicStrategy: Only ${recentCandles.length} candles available; need ${threshold} for optimization.`);
                    return;
                }

                // Call the optimization function (e.g., using a weighted or Bayesian method).
                const optimizedConfig = await OptimizationManager.optimize(
                    this.symbol,
                    this.timeframe,
                    this.config.optimizationMethod || 'grid', // default method
                    recentCandles
                );

                // Merge the optimized configuration into the current configuration.
                this.config = { ...this.config, ...optimizedConfig };

                // If the base strategy supports updating its configuration, update it.
                if (typeof this.baseStrategy.updateConfig === 'function') {
                    this.baseStrategy.updateConfig(this.config);
                    console.log(`DynamicStrategy updated configuration for ${this.symbol} ${this.timeframe}:`, this.config);
                }
                this.lastUpdateTime = Date.now();
            } catch (error) {
                console.error('Dynamic update error:', error.message);
            }
        }, intervalMs);
    }

    /**
     * Fetches recent candle data for the strategy's symbol and timeframe.
     * @returns {Promise<Array>} A promise that resolves to an array of candles in ascending order.
     */
    async fetchRecentCandles() {
        try {
            // Query the database for the latest 100 candles for the given symbol and timeframe.
            const candles = await Candle.find({
                symbol: this.symbol.toUpperCase(),
                timeframe: this.timeframe.toLowerCase()
            })
                .sort({ timestamp: -1 })
                .limit(100);
            // Reverse the array so that candles are sorted oldest first.
            return candles.reverse();
        } catch (error) {
            console.error('Error fetching recent candles:', error.message);
            return [];
        }
    }
}

module.exports = DynamicStrategy;
