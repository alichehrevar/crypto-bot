const BaseIndicator = require("./BaseIndicator");

/**
 * Simple Moving Average (SMA) indicator class.
 * Computes the average price over a specific period.
 * Generates signals based on Price vs SMA crossover.
 */
class SMA extends BaseIndicator {
    /**
     * @param {Object} params
     * @param {number} params.period - The number of candles to average (default: 14)
     */
    constructor(params = {}) {
        super(params);
        this.period = params.period || 14;
    }

    /**
     * Compute SMA values for the series.
     * @param {Array<{ open: number, high: number, low: number, close: number }>} candles
     * @returns {Array<number|null>} Array of SMA values. Returns null for initial candles where data < period.
     */
    getMetrics(candles) {
        if (!Array.isArray(candles) || candles.length === 0) {
            throw new Error("Need at least one candle for SMA");
        }

        const smaSeries = [];
        let sum = 0;

        for (let i = 0; i < candles.length; i++) {
            const close = candles[i].close;
            sum += close;

            // If we haven't reached the period yet, we can't calculate a valid SMA
            if (i < this.period) {
                if (i === this.period - 1) {
                    // First valid point: sum is full, just divide
                    smaSeries.push(sum / this.period);
                } else {
                    smaSeries.push(null);
                }
            } else {
                // Optimized sliding window: subtract the oldest, add the new
                const oldestClose = candles[i - this.period].close;
                sum -= oldestClose;
                smaSeries.push(sum / this.period);
            }
        }
        return smaSeries;
    }

    /**
     * Calculate a signal based on Price crossing the SMA.
     * @param {Array<{ open: number, high: number, low: number, close: number }>} candles
     * @returns {string} 'BUY', 'SELL', or 'HOLD'
     */
    calculateSignal(candles) {
        try {
            if (!Array.isArray(candles) || candles.length < this.period + 1) {
                // Not enough data for a crossover check
                return 'HOLD';
            }

            const smaSeries = this.getMetrics(candles);

            // Get last two valid data points
            const lastIndex = candles.length - 1;
            const prevIndex = candles.length - 2;

            const lastSMA = smaSeries[lastIndex];
            const prevSMA = smaSeries[prevIndex];

            const lastClose = candles[lastIndex].close;
            const prevClose = candles[prevIndex].close;

            // Ensure we actually have SMA values calculated for these points
            if (lastSMA === null || prevSMA === null) {
                return 'HOLD';
            }

            // BUY: Price crosses ABOVE SMA (Bullish)
            // Previous close was below/at SMA, Current close is above SMA
            if (prevClose <= prevSMA && lastClose > lastSMA) {
                return 'BUY';
            }

            // SELL: Price crosses BELOW SMA (Bearish)
            // Previous close was above/at SMA, Current close is below SMA
            if (prevClose >= prevSMA && lastClose < lastSMA) {
                return 'SELL';
            }

            return 'HOLD';
        } catch (err) {
            console.error(`SMA calculation failed: ${err.message}`);
            return 'HOLD';
        }
    }
}

module.exports = SMA;
