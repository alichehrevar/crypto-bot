const BaseStrategy = require('./BaseStrategy');

class MACD extends BaseStrategy {
    constructor(params) {
        super(params);

        if (!params || typeof params !== 'object') {
            throw new Error('MACD strategy requires a parameter object');
        }

        this.shortPeriod = params.shortPeriod || 12;   // Typically 12
        this.longPeriod = params.longPeriod || 26;     // Typically 26
        this.signalPeriod = params.signalPeriod || 9;  // Typically 9

        // Basic validations
        if (this.shortPeriod <= 0 || this.longPeriod <= 0 || this.signalPeriod <= 0) {
            throw new Error('MACD periods must be > 0');
        }
        if (this.shortPeriod >= this.longPeriod) {
            console.warn('Usually, shortPeriod < longPeriod for MACD');
        }
    }

    /**
     * Calculates the MACD line, Signal line, and Histogram for the given candle set.
     * Returns arrays for each line, with the same length as the input candle array.
     *
     * @param {Array} candles - array of candle objects with at least "close" property
     * @returns {Object} { macdLine, signalLine, histogram }
     */
    calculateMACDSeries(candles) {
        if (!Array.isArray(candles) || candles.length < this.longPeriod + this.signalPeriod) {
            throw new Error(`Not enough candles to calculate MACD (need at least ${this.longPeriod + this.signalPeriod})`);
        }

        // Step 1: Extract the closing prices
        const closes = candles.map(c => c.close);

        // Step 2: Calculate the short and long EMAs
        const shortEMA = this.calculateEMA(closes, this.shortPeriod);
        const longEMA  = this.calculateEMA(closes, this.longPeriod);

        // Step 3: MACD line = shortEMA - longEMA (element-wise)
        // But note: because 'shortEMA' and 'longEMA' arrays each "start" at index = (period - 1),
        // we align them so MACD is only valid after both EMAs exist.
        const macdLine = closes.map((_, i) => {
            // If shortEMA[i] or longEMA[i] is not set, MACD is not valid
            if (shortEMA[i] == null || longEMA[i] == null) return null;
            return shortEMA[i] - longEMA[i];
        });

        // Step 4: Calculate the Signal line = EMA of MACD line (using 'signalPeriod')
        const signalLine = this.calculateEMA(macdLine, this.signalPeriod);

        // Step 5: Histogram = MACD - Signal
        const histogram = macdLine.map((val, i) => {
            if (val == null || signalLine[i] == null) return null;
            return val - signalLine[i];
        });

        return { macdLine, signalLine, histogram };
    }

    /**
     * Helper to calculate an EMA series for the given array of prices.
     * Returns an array of same length, with nulls for the initial (period - 1) indices.
     *
     * @param {Array} values - e.g. array of closes or MACD line
     * @param {Number} period
     * @returns {Array} - array of EMAs
     */
    calculateEMA(values, period) {
        const k = 2 / (period + 1);

        const emaArr = Array(values.length).fill(null);
        let prevEma = 0;
        let emaInitialized = false;
        for (let i = 0; i < values.length; i++) {
            const val = values[i];
            if (val == null) {
                // skip if the input itself is null
                continue;
            }
            if (i === 0) {
                prevEma = val; // initial
                emaInitialized = true;
                emaArr[i] = null; // not "valid" yet
            } else if (!emaInitialized && i < period) {
                prevEma = (val * k) + (prevEma * (1 - k));
                if (i === period - 1) {
                    emaArr[i] = prevEma;
                    emaInitialized = true;
                } else {
                    emaArr[i] = null;
                }
            } else {
                prevEma = (val * k) + (prevEma * (1 - k));
                emaArr[i] = prevEma;
            }
        }
        return emaArr;
    }

    /**
     * Generates a final buy/sell/hold signal from the most recent MACD vs. Signal line crossover.
     *
     * @param {Array} candles
     * @returns {String} 'BUY', 'SELL', or 'HOLD'
     */
    calculateSignal(candles) {
        try {
            const { macdLine, signalLine } = this.calculateMACDSeries(candles);
            const n = macdLine.length;

            // We need at least 2 valid points to detect a crossover
            if (n < 2 || macdLine[n - 1] == null || signalLine[n - 1] == null) {
                console.warn('Insufficient data for reliable MACD signal');
                return 'HOLD';
            }

            const macdCurrent = macdLine[n - 1];
            const signalCurrent = signalLine[n - 1];
            const macdPrevious = macdLine[n - 2];
            const signalPrevious = signalLine[n - 2];

            // Check bullish crossover: MACD crosses above signal
            if (macdCurrent > signalCurrent && macdPrevious <= signalPrevious) {
                return 'BUY';
            }

            // Check bearish crossover: MACD crosses below signal
            if (macdCurrent < signalCurrent && macdPrevious >= signalPrevious) {
                return 'SELL';
            }

            return 'HOLD';
        } catch (error) {
            console.error(`MACD calculation error: ${error.message}`);
            return 'HOLD';
        }
    }

    /**
     * Optional helper to get current MACD values (for logging or visualization).
     *
     * @param {Array} candles
     * @returns {Object} { macd, signal, histogram }
     */
    getMetrics(candles) {
        const { macdLine, signalLine, histogram } = this.calculateMACDSeries(candles);
        const lastIndex = macdLine.length - 1;
        return {
            macd: macdLine[lastIndex],
            signal: signalLine[lastIndex],
            histogram: histogram[lastIndex]
        };
    }
}

module.exports = MACD;
