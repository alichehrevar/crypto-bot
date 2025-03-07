// Import the base indicator class which provides common functionality.
const BaseIndicator = require('./BaseIndicator');

/**
 * HurstIndicator calculates the Hurst exponent from a series of closing prices
 * and generates a trading signal based on the market’s persistence.
 *
 * Logic:
 *  - Compute the Hurst exponent using a simplified R/S analysis.
 *  - If Hurst > 0.6 (trending market):
 *      • If the latest close is higher than the previous close, return 'BUY'.
 *      • Otherwise, return 'SELL'.
 *  - If Hurst < 0.4 (mean-reverting market):
 *      • Invert the signal: if rising, return 'SELL'; if falling, return 'BUY'.
 *  - Otherwise, return 'HOLD'.
 */
class HurstIndicator extends BaseIndicator {
    constructor(params) {
        super(params);
        // No specific configuration is needed for now.
        // You could later add parameters such as custom thresholds.
    }

    /**
     * computeHurst
     *
     * Computes the Hurst exponent using a simplified version of R/S analysis.
     *
     * @param {Array<number>} prices - Array of closing prices.
     * @returns {number} The Hurst exponent.
     * @throws {Error} If there are fewer than 20 data points.
     */
    computeHurst(prices) {
        const n = prices.length;
        if (n < 20) {
            throw new Error("Not enough data to compute Hurst exponent (need at least 20 data points).");
        }
        // Calculate mean price.
        const mean = prices.reduce((acc, val) => acc + val, 0) / n;
        // Compute the cumulative deviations from the mean.
        let cumulative = 0;
        const deviations = prices.map(price => {
            cumulative += price - mean;
            return cumulative;
        });
        // Compute the range (max - min of the cumulative deviations).
        const range = Math.max(...deviations) - Math.min(...deviations);
        // Compute the standard deviation.
        const std = Math.sqrt(prices.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n);
        if (std === 0) return 0.5; // If there's no variability, return 0.5 (random walk).
        // R/S statistic.
        const rs = range / std;
        // The Hurst exponent is approximated by: log(R/S) / log(n)
        const hurst = Math.log(rs) / Math.log(n);
        return hurst;
    }

    /**
     * calculateSignal
     *
     * Generates a trading signal based on the computed Hurst exponent.
     *
     * @param {Array<Object>} candles - Array of candle objects, each with a numeric "close" property.
     * @returns {string} 'BUY', 'SELL', or 'HOLD'.
     */
    calculateSignal(candles) {
        try {
            // Extract closing prices.
            const prices = candles.map(c => c.close);
            const hurst = this.computeHurst(prices);

            // Retrieve the last two closing prices.
            const lastPrice = prices[prices.length - 1];
            const prevPrice = prices[prices.length - 2];

            // Default to HOLD.
            let signal = 'HOLD';
            if (hurst > 0.6) {
                // Trending market: if price is rising, signal BUY; if falling, signal SELL.
                signal = lastPrice > prevPrice ? 'BUY' : 'SELL';
            } else if (hurst < 0.4) {
                // Mean-reverting market: invert the direction.
                signal = lastPrice > prevPrice ? 'SELL' : 'BUY';
            }
            return signal;
        } catch (error) {
            console.error(`HurstIndicator error: ${error.message}`);
            return 'HOLD';
        }
    }

    /**
     * getMetrics
     *
     * Returns the computed Hurst exponent along with the derived signal.
     *
     * @param {Array<Object>} candles - Array of candle objects.
     * @returns {Object} Object containing the Hurst exponent and signal.
     */
    getMetrics(candles) {
        const prices = candles.map(c => c.close);
        const hurst = this.computeHurst(prices);
        const signal = this.calculateSignal(candles);
        return { hurst, signal };
    }
}

module.exports = HurstIndicator;
