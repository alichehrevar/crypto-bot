// strategies/technical/StochasticRSI.js

const BaseIndicator = require('./BaseIndicator');

/**
 * StochasticRSI indicator class
 *
 * Calculates signals based on Stochastic RSI crossovers of %K and %D lines.
 */
class StochasticRSI extends BaseIndicator {
    /**
     * @param {Object} params - configuration object
     *   - kPeriod: lookback period for %K
     *   - dPeriod: smoothing period for %D
     *   - overbought?: threshold for overbought (optional)
     *   - oversold?: threshold for oversold (optional)
     */
    constructor(params) {
        super(params);
        if (!params || typeof params !== 'object') {
            throw new Error('StochasticRSI requires configuration object');
        }
        const { kPeriod, dPeriod, overbought = 80, oversold = 20 } = params;
        if (!Number.isInteger(kPeriod) || kPeriod < 1) {
            throw new Error('Invalid kPeriod for StochasticRSI');
        }
        if (!Number.isInteger(dPeriod) || dPeriod < 1) {
            throw new Error('Invalid dPeriod for StochasticRSI');
        }
        this.kPeriod = kPeriod;
        this.dPeriod = dPeriod;
        this.overbought = overbought;
        this.oversold = oversold;
    }

    /**
     * updateConfig merges new params and re-validates
     */
    updateConfig(newConfig) {
        Object.assign(this, newConfig);
        // Re-validate periods
        if (!Number.isInteger(this.kPeriod) || this.kPeriod < 1) {
            throw new Error('Invalid kPeriod after update');
        }
        if (!Number.isInteger(this.dPeriod) || this.dPeriod < 1) {
            throw new Error('Invalid dPeriod after update');
        }
        console.log('StochasticRSI config updated:', newConfig);
    }

    /**
     * calculateSignal for the last candle based on %K and %D crossover
     * @param {Array<Object>} candles - array of candles with properties `${name}_k` and `${name}_d`
     */
    calculateSignal(candles) {
        const name = this.name || 'stochrsi';
        const kField = `${name}_k`;
        const dField = `${name}_d`;
        if (!candles || candles.length < 2) {
            console.warn('Insufficient data for StochasticRSI signal');
            return 'HOLD';
        }
        const last = candles.length - 1;
        const kCurr = candles[last][kField];
        const dCurr = candles[last][dField];
        const kPrev = candles[last - 1][kField];
        const dPrev = candles[last - 1][dField];

        if (typeof kCurr !== 'number' || typeof dCurr !== 'number' || typeof kPrev !== 'number' || typeof dPrev !== 'number') {
            console.error('Missing StochasticRSI fields on candles');
            return 'HOLD';
        }
        console.log('Calculated StochasticRSI K/D:', kPrev, dPrev, '->', kCurr, dCurr);
        if (kPrev <= dPrev && kCurr > dCurr) {
            return 'BUY';
        }
        if (kPrev >= dPrev && kCurr < dCurr) {
            return 'SELL';
        }
        return 'HOLD';
    }

    /**
     * getMetrics returns last values and thresholds
     */
    getMetrics(candles) {
        const name = this.name || 'stochrsi';
        const kField = `${name}_k`;
        const dField = `${name}_d`;
        const last = candles.length - 1;
        const kVal = candles[last][kField];
        const dVal = candles[last][dField];
        return {
            k: kVal,
            d: dVal,
            overbought: this.overbought,
            oversold: this.oversold,
            status: kVal > this.overbought ? 'overbought' : kVal < this.oversold ? 'oversold' : 'neutral'
        };
    }
}

module.exports = StochasticRSI;
