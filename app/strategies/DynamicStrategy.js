// strategies/DynamicStrategy.js

// Import the Candle model to fetch recent historical data.
const Candle = require('../models/Candle');
// Import the risk management module that contains an optimization function.
// (Ensure that RiskManagement or RiskStrategy path matches your project structure.)
const RiskManagement = require('../strategies/RiskManagement');

/**
 * DynamicStrategy
 *
 * This class wraps a base indicator strategy to allow for dynamic updates to its configuration.
 * It periodically fetches recent candle data, re-optimizes parameters using a risk management
 * optimization function (e.g., weighted optimization), and updates the base strategy configuration.
 */
class DynamicStrategy {
    /**
     * Constructs a DynamicStrategy instance.
     *
     * @param {Object} baseStrategy - An instance of a base indicator strategy (e.g., RSI, MACD).
     * @param {Object} initialConfig - The initial configuration parameters for the strategy.
     * @param {string} symbol - The trading symbol (e.g., "BTC/USDT").
     * @param {string} timeframe - The trading timeframe (e.g., "1h").
     * @param {number} [updateIntervalMs=60000] - Interval in milliseconds for parameter updates.
     */
    constructor(baseStrategy, initialConfig, symbol, timeframe, updateIntervalMs = 60000) {
        this.baseStrategy = baseStrategy;
        this.config = initialConfig;
        this.symbol = symbol;
        this.timeframe = timeframe;
        this.lastUpdateTime = Date.now();

        // Start periodic dynamic updates.
        this.startDynamicUpdates(updateIntervalMs);
    }

    /**
     * Calculates a trading signal using the underlying base strategy.
     *
     * @param {Array<Object>} candles - An array of candle data.
     * @returns {string} The trading signal ('BUY', 'SELL', or 'HOLD').
     */
    calculateSignal(candles) {
        return this.baseStrategy.calculateSignal(candles);
    }

    /**
     * Updates the configuration of the base strategy.
     * If the base strategy supports an updateConfig method, it will be called.
     *
     * @param {Object} newConfig - New configuration parameters.
     */
    updateConfig(newConfig) {
        // Merge new configuration parameters with the current config.
        this.config = { ...this.config, ...newConfig };
        // If the base strategy provides an updateConfig function, call it.
        if (typeof this.baseStrategy.updateConfig === 'function') {
            this.baseStrategy.updateConfig(this.config);
        }
        console.log(`DynamicStrategy updated configuration for ${this.symbol} ${this.timeframe}:`, this.config);
    }

    /**
     * Starts dynamic parameter updates at a specified interval.
     * This method periodically fetches recent candle data and uses the risk management module
     * to re-optimize strategy parameters.
     *
     * @param {number} intervalMs - The update interval in milliseconds.
     */
    startDynamicUpdates(intervalMs) {
        setInterval(async () => {
            try {
                // Fetch recent candles from the database.
                const recentCandles = await this.fetchRecentCandles();
                // Optimize the configuration using the risk management optimization function.
                // Here, we use a 'weighted' optimization method as an example.
                const optimizedConfig = RiskManagement.optimizeParameters(
                    this.symbol,
                    this.timeframe,
                    'weighted', // You can switch this method as needed.
                    recentCandles
                );
                // Update the base strategy's configuration with the optimized parameters.
                this.updateConfig(optimizedConfig);
                this.lastUpdateTime = Date.now();
            } catch (error) {
                console.error(`Dynamic update error for ${this.symbol} ${this.timeframe}: ${error.message}`);
            }
        }, intervalMs);
    }

    /**
     * Fetches the most recent candle data for the strategy's symbol and timeframe.
     *
     * @returns {Promise<Array<Object>>} A promise that resolves to an array of candle objects,
     *                                  sorted in ascending order by timestamp.
     */
    async fetchRecentCandles() {
        try {
            const candles = await Candle.find({
                symbol: this.symbol.toUpperCase(),
                timeframe: this.timeframe.toLowerCase()
            })
                .sort({ timestamp: -1 })
                .limit(100);
            // Reverse the array so that candles are in ascending order (oldest first).
            return candles.reverse();
        } catch (error) {
            console.error(`Error fetching recent candles for ${this.symbol} ${this.timeframe}: ${error.message}`);
            return [];
        }
    }
}

module.exports = DynamicStrategy;
