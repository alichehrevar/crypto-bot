// strategies/technical/BollingerBands.js

const BaseIndicator = require("./BaseIndicator");

/**
 * Bollinger Bands indicator:
 * - basis: simple moving average (SMA)
 * - upper1: basis + numStdDev * standard deviation
 * - lower1: basis - numStdDev * standard deviation
 * Signals:
 *   BUY when price crosses above lower1
 *   SELL when price crosses below upper1
 */
class BollingerBands extends BaseIndicator {
    /**
     * @param {Object} params
     *   - period: lookback length for SMA and std dev
     *   - stdDevMultiplier: number of standard deviations for bands
     */
    constructor(params) {
        super(params);
        if (!params || typeof params !== 'object') throw new Error('BollingerBands requires params');
        this.period = params.period || 20;
        this.stdDevMultiplier = params.stdDevMultiplier || 2;
        if (this.period < 1 || typeof this.stdDevMultiplier !== 'number') {
            throw new Error('Invalid BollingerBands configuration');
        }
    }

    /**
     * updateConfig: allow dynamic update of period or multiplier
     */
    updateConfig(newConfig) {
        Object.assign(this, newConfig);
        if (this.period < 1 || typeof this.stdDevMultiplier !== 'number') {
            throw new Error('Invalid BollingerBands configuration after update');
        }
        console.log('BollingerBands config updated:', newConfig);
    }

    /**
     * getMetrics: calculate bands for given candles
     * @param {Array<Object>} candles
     * @returns {Object} with basis, upper1, lower1 for last candle
     */
    getMetrics(candles) {
        if (candles.length < this.period) {
            throw new Error(`Need at least ${this.period} candles for BollingerBands`);
        }
        const slice = candles.slice(-this.period);
        const closes = slice.map(c => c.close);
        const sum = closes.reduce((a, b) => a + b, 0);
        const mean = sum / this.period;
        const variance = closes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / this.period;
        const stdDev = Math.sqrt(variance);
        return {
            basis: Number(mean.toFixed(2)),
            upper1: Number((mean + this.stdDevMultiplier * stdDev).toFixed(2)),
            lower1: Number((mean - this.stdDevMultiplier * stdDev).toFixed(2)),
            period: this.period,
            stdDevMultiplier: this.stdDevMultiplier
        };
    }

    /**
     * calculateSignal: determines BUY/SELL/HOLD for last candle
     * @param {Array<Object>} candles
     * @returns {string}
     */
    calculateSignal(candles) {
        try {
            if (candles.length < this.period + 1) {
                console.warn('Not enough data for BollingerBands signal');
                return 'HOLD';
            }
            const prevSlice = candles.slice(0, -1);
            const metricsPrev = this.getMetrics(prevSlice);
            const metricsCurr = this.getMetrics(candles);
            const prevClose = prevSlice[prevSlice.length - 1].close;
            const currClose = candles[candles.length - 1].close;

            // CROSS BELOW UPPER -> SELL
            if (prevClose >= metricsPrev.upper1 && currClose < metricsCurr.upper1) {
                return 'SELL';
            }
            // CROSS ABOVE LOWER -> BUY
            if (prevClose <= metricsPrev.lower1 && currClose > metricsCurr.lower1) {
                return 'BUY';
            }
            return 'HOLD';
        } catch (err) {
            console.error(`BollingerBands signal error: ${err.message}`);
            return 'HOLD';
        }
    }
}

module.exports = BollingerBands;
