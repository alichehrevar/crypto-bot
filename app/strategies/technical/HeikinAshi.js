// strategies/technical/HeikinAshi.js

const BaseIndicator = require("./BaseIndicator");

/**
 * Heikin-Ashi indicator class.
 * Computes HA candles and generates buy/sell/hold signals based on HA open/close crossover.
 */
class HeikinAshi extends BaseIndicator {
    /**
     * @param {Object} params - no required params, but placeholder for consistency
     */
    constructor(params = {}) {
        super(params);
        // No specific numeric params needed for Heikin-Ashi
    }

    /**
     * Compute Heikin-Ashi candles for the series.
     * @param {Array<{ open: number, high: number, low: number, close: number }>} candles
     * @returns {Array<{ haOpen: number, haHigh: number, haLow: number, haClose: number }>} HA series
     */
    getMetrics(candles) {
        if (!Array.isArray(candles) || candles.length === 0) {
            throw new Error("Need at least one candle for Heikin-Ashi");
        }
        const ha = [];
        for (let i = 0; i < candles.length; i++) {
            const { open, high, low, close } = candles[i];
            if (i === 0) {
                // First HA candle uses real open/close
                const haClose0 = (open + high + low + close) / 4;
                const haOpen0 = (open + close) / 2;
                ha.push({ haOpen: haOpen0, haHigh: high, haLow: low, haClose: haClose0 });
            } else {
                const prev = ha[i - 1];
                const haClose = (open + high + low + close) / 4;
                const haOpen = (prev.haOpen + prev.haClose) / 2;
                const haHigh = Math.max(high, haOpen, haClose);
                const haLow = Math.min(low, haOpen, haClose);
                ha.push({ haOpen, haHigh, haLow, haClose });
            }
        }
        return ha;
    }

    /**
     * Calculate a single signal based on the last two HA candles.
     * @param {Array<{ open: number, high: number, low: number, close: number }>} candles
     * @returns {string} 'BUY', 'SELL', or 'HOLD'
     */
    calculateSignal(candles) {
        try {
            if (!Array.isArray(candles) || candles.length < 2) {
                console.warn("Insufficient data for Heikin-Ashi signal");
                return 'HOLD';
            }

            const haSeries = this.getMetrics(candles);
            const prev = haSeries[haSeries.length - 2];
            const last = haSeries[haSeries.length - 1];

            // BUY: The HA close crosses above HA open
            if (last.haClose > last.haOpen && prev.haClose <= prev.haOpen) {
                return 'BUY';
            }
            // SELL: HA close crosses below HA open
            if (last.haClose < last.haOpen && prev.haClose >= prev.haOpen) {
                return 'SELL';
            }
            return 'HOLD';
        } catch (err) {
            console.error(`HeikinAshi calculation failed: ${err.message}`);
            return 'HOLD';
        }
    }
}

module.exports = HeikinAshi;
