// Import the base indicator class which provides common functionality.
const BaseIndicator = require('../strategies/technical/BaseIndicator');

/**
 * HurstIndicator calculates the Hurst exponent from a series of closing prices
 * and generates a trading signal based on the market’s persistence.
 *
 * Signal Logic:
 *  - Compute the Hurst exponent using a simplified R/S analysis.
 *  - If Hurst > 0.6 (indicating a trending market):
 *      • If the latest close is higher than the previous close, return "High Trend".
 *      • Otherwise, return "Reversal".
 *  - If Hurst < 0.4 (indicating a mean-reverting market):
 *      • Invert the logic: if the price is rising, return "Reversal"; if falling, return "High Trend".
 *  - Otherwise (Hurst between 0.4 and 0.6), return "Near Random".
 */
class HurstIndicator extends BaseIndicator {
    constructor(params) {
        super(params);
        // No additional configuration required for now.
    }

    /**
     * computeHurst
     *
     * Computes the Hurst exponent using a simplified version of R/S analysis.
     *
     * @param {Array<number>} prices - Array of closing prices.
     * @returns {number} The computed Hurst exponent.
     * @throws {Error} If there are fewer than 20 data points.
     */
    computeHurst(prices) {
        const n = prices.length;
        if (n < 20) {
            throw new Error("Not enough data to compute Hurst exponent (need at least 20 data points).");
        }
        // Calculate the mean of the prices.
        const mean = prices.reduce((acc, val) => acc + val, 0) / n;
        // Compute cumulative deviations from the mean.
        let cumulative = 0;
        const deviations = prices.map(price => {
            cumulative += price - mean;
            return cumulative;
        });
        // Determine the range of the cumulative deviations.
        const range = Math.max(...deviations) - Math.min(...deviations);
        // Compute the standard deviation of the prices.
        const std = Math.sqrt(prices.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n);
        if (std === 0) return 0.5; // Return 0.5 (random walk) if there's no variability.
        // Compute the R/S statistic.
        const rs = range / std;
        // Approximate the Hurst exponent: log(R/S) divided by log(n).
        const hurst = Math.log(rs) / Math.log(n);
        return hurst;
    }

    /**
     * calculateSignal
     *
     * Generates a trading signal based on the computed Hurst exponent.
     *
     * @param {Array<Object>} candles - Array of candle objects, each containing a numeric "close" property.
     * @returns {string} One of "High Trend", "Reversal", or "Near Random".
     */
    calculateSignal(candles) {
        try {
            // Extract closing prices from the candles.
            const prices = candles.map(c => c.close);
            // Compute the Hurst exponent.
            const hurst = this.computeHurst(prices);

            // Retrieve the last two closing prices for trend comparison.
            const lastPrice = prices[prices.length - 1];
            const prevPrice = prices[prices.length - 2];

            // Default signal is "Near Random".
            let signal = 'Near Random';
            if (hurst > 0.6) {
                // In a trending market:
                // - If the latest price is higher than the previous, market is trending upward: "High Trend".
                // - Otherwise, it suggests a possible reversal.
                signal = lastPrice > prevPrice ? 'High Trend' : 'Reversal';
            } else if (hurst < 0.4) {
                // In a mean-reverting market, invert the signal:
                // - If the price is rising, it may indicate an impending reversal.
                // - If falling, the trend may continue.
                signal = lastPrice > prevPrice ? 'Reversal' : 'High Trend';
            }
            return signal;
        } catch (error) {
            console.error(`HurstIndicator error: ${error.message}`);
            return 'Near Random';
        }
    }

    /**
     * getMetrics
     *
     * Returns the computed Hurst exponent along with the derived signal.
     *
     * @param {Array<Object>} candles - Array of candle objects.
     * @returns {Object} Object containing the Hurst exponent and the trading signal.
     */
    getMetrics(candles) {
        const prices = candles.map(c => c.close);
        const hurst = this.computeHurst(prices);
        const signal = this.calculateSignal(candles);
        return { hurst, signal };
    }
}

module.exports = HurstIndicator;
