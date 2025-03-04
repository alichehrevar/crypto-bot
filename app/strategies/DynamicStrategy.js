const Candle = require('../models/Candle');
// Import the risk management module that includes parameter optimization.
// (Ensure this path matches your project structure; here we assume it's in the same directory.)
const RiskManagement = require('./RiskManagement');

/**
 * DynamicStrategy
 *
 * Wraps a base strategy to enable dynamic parameter updates.
 * The strategy periodically re-optimizes its parameters using recent candle data.
 *
 * @param {object} baseStrategy - An instance of an indicator strategy (e.g., RSI, MACD, etc.).
 *                                The base strategy should expose a calculateSignal(candles) method,
 *                                and optionally an updateConfig(newConfig) method.
 * @param {object} initialConfig - The initial configuration parameters.
 * @param {string} symbol - Trading symbol, e.g., "BTC/USDT".
 * @param {string} timeframe - Trading timeframe, e.g., "1h".
 * @param {number} updateIntervalMs - How often (in ms) to re‑evaluate parameters (default is 60000 ms, i.e. 1 minute).
 */
class DynamicStrategy {
    constructor(baseStrategy, initialConfig, symbol, timeframe, updateIntervalMs = 60000) {
        this.baseStrategy = baseStrategy;
        this.config = initialConfig;
        this.symbol = symbol;
        this.timeframe = timeframe;
        this.lastUpdateTime = Date.now();
        // Store the interval ID so we can clear it if necessary.
        this.updateIntervalId = this.startDynamicUpdates(updateIntervalMs);
    }

    /**
     * calculateSignal
     *
     * Proxies the call to the base strategy's calculateSignal method.
     *
     * @param {Array<Object>} candles - An array of candle data.
     * @returns {string} The trading signal ('BUY', 'SELL', or 'HOLD').
     */
    calculateSignal(candles) {
        return this.baseStrategy.calculateSignal(candles);
    }

    /**
     * startDynamicUpdates
     *
     * Sets up a periodic task to re-optimize strategy parameters using recent candle data.
     * Uses the RiskManagement.optimizeParameters() function to update the configuration.
     *
     * @param {number} intervalMs - The update interval in milliseconds.
     * @returns {number} The interval ID.
     */
    startDynamicUpdates(intervalMs) {
        return setInterval(async () => {
            try {
                // Fetch recent candle data from the database.
                const recentCandles = await this.fetchRecentCandles();
                // Optimize parameters using the risk management module.
                // We assume optimizeParameters returns a promise.
                const optimizedConfig = await RiskManagement.optimizeParameters(
                    this.symbol,
                    this.timeframe,
                    'weighted', // or any other optimization method you choose
                    recentCandles
                );
                // Merge the optimized configuration into the current config.
                this.config = { ...this.config, ...optimizedConfig };
                // If the base strategy supports updating its configuration, update it.
                if (typeof this.baseStrategy.updateConfig === 'function') {
                    this.baseStrategy.updateConfig(this.config);
                    console.log(
                        `DynamicStrategy updated configuration for ${this.symbol} ${this.timeframe}:`,
                        this.config
                    );
                }
                this.lastUpdateTime = Date.now();
            } catch (error) {
                console.error('Dynamic update error:', error.message);
            }
        }, intervalMs);
    }

    /**
     * fetchRecentCandles
     *
     * Fetches the most recent 100 candles for the strategy's symbol and timeframe,
     * sorted in ascending order (oldest first).
     *
     * @returns {Promise<Array<Object>>} A promise that resolves to an array of candle objects.
     */
    async fetchRecentCandles() {
        try {
            const candles = await Candle.find({
                symbol: this.symbol.toUpperCase(),
                timeframe: this.timeframe.toLowerCase()
            })
                .sort({ timestamp: -1 })
                .limit(100);
            // Reverse the array so that candles are in ascending order by timestamp.
            return candles.reverse();
        } catch (error) {
            console.error('Error fetching recent candles:', error.message);
            return [];
        }
    }
}

module.exports = DynamicStrategy;
