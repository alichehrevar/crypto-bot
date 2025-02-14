const BaseStrategy = require('./BaseIndicator');

class MACD extends BaseStrategy {
    constructor(params = { shortPeriod: 12, longPeriod: 26, signalPeriod: 9 }) {
        super(params);

        if (!params || typeof params !== 'object') {
            throw new Error('MACD strategy requires a parameter object');
        }

        this.shortPeriod = params.shortPeriod || 12;   // Typically 12
        this.longPeriod = params.longPeriod || 26;       // Typically 26
        this.signalPeriod = params.signalPeriod || 9;    // Typically 9

        // Basic validations
        if (this.shortPeriod <= 0 || this.longPeriod <= 0 || this.signalPeriod <= 0) {
            throw new Error('MACD periods must be > 0');
        }
        if (this.shortPeriod >= this.longPeriod) {
            console.warn('Usually, shortPeriod < longPeriod for MACD');
        }
    }

    /**
     * Calculates the MACD line and Signal line for the given candle set.
     * Returns an object with { macdLine, signalLine }.
     *
     * @param {Array} candles - array of candle objects with at least a "close" property
     * @returns {Object}
     */
    calculateMACDSeries(candles) {
        // Require enough candles: longPeriod + signalPeriod
        if (!Array.isArray(candles) || candles.length < this.longPeriod + this.signalPeriod) {
            throw new Error(`Need at least ${this.longPeriod + this.signalPeriod} candles`);
        }

        const closes = candles.map(c => c.close);

        // Calculate EMAs using close prices
        const shortEMA = this.calculateEMA(closes, this.shortPeriod);
        const longEMA = this.calculateEMA(closes, this.longPeriod);

        // Calculate MACD line (only where both EMAs exist)
        const macdLine = closes.map((_, i) => {
            if (i < this.longPeriod - 1) return null; // wait until longEMA is valid
            return shortEMA[i] - longEMA[i];
        });

        // Calculate signal line from valid MACD values
        const validMACD = macdLine.filter(v => v !== null);
        const signalEMA = this.calculateEMA(validMACD, this.signalPeriod);

        // Align signal line with original MACD array by padding with nulls
        const offset = macdLine.length - validMACD.length;
        const signalLine = macdLine.map((_, i) => (i >= offset ? signalEMA[i - offset] : null));

        return { macdLine, signalLine };
    }

    /**
     * Calculates an EMA series for the given array of values.
     * Returns an array of the same length, with nulls for the first (period - 1) indices.
     *
     * @param {Array} values - array of numbers
     * @param {Number} period
     * @returns {Array}
     */
    calculateEMA(values, period) {
        const k = 2 / (period + 1);
        const emaArr = Array(values.length).fill(null);
        if (values.length < period) return emaArr;

        // Use the simple average of the first 'period' values as the initial EMA
        const initialSlice = values.slice(0, period);
        const sum = initialSlice.reduce((acc, v) => acc + v, 0);
        let prevEma = sum / period;
        emaArr[period - 1] = prevEma;

        for (let i = period; i < values.length; i++) {
            const val = values[i];
            prevEma = (val - prevEma) * k + prevEma;
            emaArr[i] = prevEma;
        }
        return emaArr;
    }

    /**
     * Generates a final buy/sell/hold signal from the MACD vs. Signal line crossover.
     *
     * @param {Array} candles - array of candle objects with at least a "close" property
     * @returns {String} 'BUY', 'SELL', or 'HOLD'
     */
    calculateSignal(candles) {
        try {
            const { macdLine, signalLine } = this.calculateMACDSeries(candles);

            // Find the last valid values
            const validMACD = macdLine.filter(v => v !== null);
            const validSignal = signalLine.filter(v => v !== null);

            // Need at least 2 valid points for crossover detection
            if (validMACD.length < 2 || validSignal.length < 2) {
                return 'HOLD';
            }

            const prevMACD = validMACD[validMACD.length - 2];
            const currMACD = validMACD[validMACD.length - 1];
            const prevSignal = validSignal[validSignal.length - 2];
            const currSignal = validSignal[validSignal.length - 1];

            // Detect bullish crossover
            if (prevMACD < prevSignal && currMACD > currSignal) {
                return 'BUY';
            }

            return 'HOLD';
        } catch (error) {
            console.error(`MACD calculation error: ${error.message}`);
            return 'HOLD';
        }
    }
}

module.exports = MACD;
