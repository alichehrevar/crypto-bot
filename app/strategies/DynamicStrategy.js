// strategies/DynamicStrategy.js
// Import necessary modules and services.
const Candle = require('../models/Candle');
const Hurst = require('../metrics/Hurst'); // Assuming Hurst has been moved to strategies.
const BacktestService = require('../services/backtestService/BacktestService');
const OptimizationManager = require('./optimization/OptimizationManager');

/**
 * DynamicStrategy wraps a base indicator strategy to enable dynamic parameter optimization.
 * It periodically re‑evaluates the strategy parameters based on recent market data.
 */
class DynamicStrategy {
    /**
     * @param {object} baseStrategy - An instance of an indicator strategy (e.g., RSI, MACD, etc.)
     * @param {object} initialConfig - The initial configuration parameters for the strategy.
     * @param {string} symbol - The trading symbol, e.g. "BTC/USDT".
     * @param {string} timeframe - The trading timeframe, e.g. "1h".
     * @param {number} updateIntervalMs - How often (in ms) to re‑evaluate parameters. Defaults to 60000.
     * @param {number} minBotAccuracy - The minimum acceptable performance metric for candidate indicators.
     *                                  It will be capped at 0.8 if a higher value is given.
     */
    constructor(baseStrategy, initialConfig, symbol, timeframe, updateIntervalMs = 60000, minBotAccuracy = 0.5) {
        this.baseStrategy = baseStrategy;
        this.config = initialConfig;
        this.symbol = symbol;
        this.timeframe = timeframe;
        this.lastUpdateTime = Date.now();
        // Ensure the minimum bot accuracy does not exceed 0.8.
        this.minBotAccuracy = Math.min(minBotAccuracy, 0.8);

        // Start the periodic dynamic updates.
        this.startDynamicUpdates(updateIntervalMs);
    }

    /**
     * Proxy method to calculate the signal using the current base strategy.
     * @param {Array<Object>} candles - Array of candle objects.
     * @returns {string} The trading signal: 'BUY', 'SELL', or 'HOLD'.
     */
    calculateSignal(candles) {
        return this.baseStrategy.calculateSignal(candles);
    }

    /**
     * Starts periodic dynamic updates.
     * At each interval:
     *   1. Fetch recent candle data.
     *   2. Classify the market using the Hurst exponent.
     *   3. Look up recommended candidate indicators for the current market range and timeframe.
     *   4. Backtest each candidate to compute a performance metric.
     *   5. Filter out candidates that do not meet the minimum accuracy and cap performance at 0.8.
     *   6. Update the strategy configuration with the best candidate's parameters.
     *
     * @param {number} intervalMs - Update interval in milliseconds.
     */
    startDynamicUpdates(intervalMs) {
        setInterval(async () => {
            try {
                // 1. Fetch recent candle data from the database.
                const recentCandles = await this.fetchRecentCandles();

                // 2. Classify market conditions using the Hurst exponent.
                const marketRange = this.classifyMarket(recentCandles); // e.g., "High Trend", "Reversal", or "Near Random"

                // 3. Get recommended indicators for the given market range and timeframe.
                // (This uses a lookup table defined elsewhere, via the OptimizationManager.)
                const recommendedIndicators = OptimizationManager.getRecommendedIndicators(marketRange, this.timeframe);

                // 4. Backtest each recommended indicator to simulate performance.
                let bestCandidate = null;
                let bestPerformance = -Infinity;
                for (const candidateIndicator of recommendedIndicators) {
                    // Retrieve candidate default parameters from a helper function.
                    const candidateParams = this.getCandidateParams(candidateIndicator);
                    let summary;
                    try {
                        summary = await BacktestService.run({
                            strategy: candidateIndicator,
                            params: candidateParams,
                            symbol: this.symbol,
                            timeframe: this.timeframe,
                            startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // last 7 days of data
                            endDate: new Date(),
                            initialBalance: 10000,
                            positionSize: 1.0
                        });
                    } catch (e) {
                        console.error(`Backtest failed for ${candidateIndicator}:`, e.message);
                        continue;
                    }
                    let performance = summary.finalBalance;
                    // 5a. Discard candidate if its performance is below the minimum bot accuracy.
                    if (performance < this.minBotAccuracy) continue;
                    // 5b. Cap performance at 0.8.
                    if (performance > 0.8) performance = 0.8;
                    if (performance > bestPerformance) {
                        bestPerformance = performance;
                        bestCandidate = { indicator: candidateIndicator, params: candidateParams, performance };
                    }
                }

                // 6. If a candidate is found, update the dynamic configuration.
                if (bestCandidate) {
                    // Merge candidate parameters into current configuration.
                    this.config = { ...this.config, ...bestCandidate.params, weight: bestCandidate.performance };
                    // If the base strategy supports dynamic configuration updates, apply them.
                    if (typeof this.baseStrategy.updateConfig === 'function') {
                        this.baseStrategy.updateConfig(this.config);
                        console.log(`DynamicStrategy updated configuration for ${this.symbol} ${this.timeframe}:`, this.config);
                    }
                }

                this.lastUpdateTime = Date.now();
            } catch (error) {
                console.error('Dynamic update error:', error.message);
            }
        }, intervalMs);
    }

    /**
     * Fetches the most recent 100 candles for the bot's symbol and timeframe.
     * @returns {Promise<Array<Object>>} A promise that resolves to an array of candle objects (sorted oldest first).
     */
    async fetchRecentCandles() {
        try {
            const candles = await Candle.find({
                symbol: this.symbol.toUpperCase(),
                timeframe: this.timeframe.toLowerCase()
            }).sort({ timestamp: -1 }).limit(100);
            return candles.reverse(); // Reverse so that they are in chronological order.
        } catch (error) {
            console.error('Error fetching recent candles:', error.message);
            return [];
        }
    }

    /**
     * Classifies market conditions using the Hurst exponent.
     * - Hurst > 0.6: "High Trend"
     * - Hurst < 0.4: "Reversal"
     * - Otherwise: "Near Random"
     *
     * @param {Array<Object>} candles - Array of candle objects.
     * @returns {string} Market classification.
     */
    classifyMarket(candles) {
        const hurstInstance = new Hurst({});
        try {
            const prices = candles.map(c => c.close);
            const hurstValue = hurstInstance.computeHurst(prices);
            if (hurstValue > 0.6) return "High Trend";
            else if (hurstValue < 0.4) return "Reversal";
            else return "Near Random";
        } catch (error) {
            console.error('Error classifying market:', error.message);
            return "Near Random";
        }
    }

    /**
     * Retrieves default candidate parameters for a given indicator.
     * This can be replaced or extended to fetch candidate parameters from a database or configuration file.
     *
     * @param {string} indicator - The indicator name.
     * @returns {object} Default parameters for the indicator.
     */
    getCandidateParams(indicator) {
        const defaultParams = {
            RSI: { period: 14, overbought: 70, oversold: 30 },
            MACD: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
            MA_Crossover: { shortPeriod: 5, longPeriod: 20 },
            // Extend with other indicator defaults as needed.
        };
        return defaultParams[indicator] || {};
    }
}

module.exports = DynamicStrategy;
