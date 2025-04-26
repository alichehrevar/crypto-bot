// technical/MACD.js

// Import the base class for technical.
const BaseIndicator = require('./BaseIndicator');

class MACD extends BaseIndicator {
    /**
     * Creates an instance of the MACD indicator.
     *
     * @param {Object} params - Configuration object for the MACD indicator.
     *   Required properties:
     *     - shortPeriod: Number (e.g., 12)
     *     - longPeriod: Number (e.g., 26)
     *     - signalPeriod: Number (e.g., 9)
     *
     * @throws {Error} If params is not provided or is not an object.
     */
    constructor(params) {
        super(params);
        // Force a configuration object; do not use a default value.
        if (!params || typeof params !== 'object') {
            throw new Error('MACD strategy requires a parameter object');
        }
        // Set the periods from the configuration.
        this.shortPeriod = params.shortPeriod || 12;
        this.longPeriod = params.longPeriod || 26;
        this.signalPeriod = params.signalPeriod || 9;

        // Validate that the periods are numbers and greater than 0.
        if (typeof this.shortPeriod !== 'number' || typeof this.longPeriod !== 'number' || typeof this.signalPeriod !== 'number') {
            throw new Error('MACD periods must be numbers');
        }
        if (this.shortPeriod <= 0 || this.longPeriod <= 0 || this.signalPeriod <= 0) {
            throw new Error('MACD periods must be > 0');
        }
        // Warn if shortPeriod is not less than longPeriod.
        if (this.shortPeriod >= this.longPeriod) {
            console.warn('Usually, shortPeriod < longPeriod for MACD');
        }
    }

    /**
     * updateConfig
     *
     * Dynamically updates the configuration of the MACD indicator.
     *
     * @param {Object} newConfig - New configuration values to merge.
     * @throws {Error} If the updated configuration is invalid.
     */
    updateConfig(newConfig) {
        // Merge new configuration into the instance.
        Object.assign(this, newConfig);
        // Revalidate the updated periods.
        if (this.shortPeriod <= 0 || this.longPeriod <= 0 || this.signalPeriod <= 0) {
            throw new Error('MACD periods must be > 0 after update');
        }
        if (this.shortPeriod >= this.longPeriod) {
            console.warn('Usually, shortPeriod < longPeriod for MACD');
        }
        console.log('MACD configuration updated:', newConfig);
    }

    /**
     * calculateEMA
     *
     * Calculates the Exponential Moving Average (EMA) for a given array of numbers.
     *
     * @param {Array<number>} values - Array of numbers (e.g., closing prices).
     * @param {number} period - The period for the EMA.
     * @returns {Array<number|null>} Array of EMA values, with null for the first (period-1) elements.
     */
    calculateEMA(values, period) {
        const k = 2 / (period + 1);
        const emaArr = Array(values.length).fill(null);
        if (values.length < period) return emaArr;
        // Compute the initial SMA and set it as the first valid EMA.
        const initialSlice = values.slice(0, period);
        const sum = initialSlice.reduce((acc, v) => acc + v, 0);
        let prevEma = sum / period;
        emaArr[period - 1] = prevEma;
        // Calculate EMA for subsequent values.
        for (let i = period; i < values.length; i++) {
            const val = values[i];
            prevEma = (val - prevEma) * k + prevEma;
            emaArr[i] = prevEma;
        }
        return emaArr;
    }

    /**
     * calculateMACDSeries
     *
     * Computes the MACD line and the Signal line from candle data.
     *
     * @param {Array<Object>} candles - Array of candle objects (each must have a numeric "close" property).
     * @returns {Object} An object containing:
     *    - macdLine: Array of MACD values (null for indices where computation isn't possible).
     *    - signalLine: Array of Signal line values aligned with macdLine.
     * @throws {Error} If insufficient candle data is provided.
     */
    calculateMACDSeries(candles) {
        // Require at least longPeriod + signalPeriod candles for reliable calculation.
        if (!Array.isArray(candles) || candles.length < this.longPeriod + this.signalPeriod) {
            throw new Error(`Need at least ${this.longPeriod + this.signalPeriod} candles`);
        }
        // Extract closing prices.
        const closes = candles.map(c => c.close);
        // Calculate short and long EMAs.
        const shortEMA = this.calculateEMA(closes, this.shortPeriod);
        const longEMA = this.calculateEMA(closes, this.longPeriod);
        // Compute the MACD line as the difference between shortEMA and longEMA.
        const macdLine = closes.map((_, i) => {
            if (i < this.longPeriod - 1) return null;
            return shortEMA[i] - longEMA[i];
        });
        // Filter out nulls to compute the signal line.
        const validMACD = macdLine.filter(v => v !== null);
        // Calculate the EMA of the valid MACD values to serve as the signal line.
        const signalEMA = this.calculateEMA(validMACD, this.signalPeriod);
        // Align the signal line with the macdLine array.
        const offset = macdLine.length - validMACD.length;
        const signalLine = macdLine.map((_, i) => (i >= offset ? signalEMA[i - offset] : null));
        return { macdLine, signalLine };
    }

    /**
     * calculateSignal
     *
     * Generates a trading signal based on the crossover between the MACD line and the Signal line.
     *
     * @param {Array<Object>} candles - Array of candle objects.
     * @returns {string} 'BUY', 'SELL', or 'HOLD'.
     */
    calculateSignal(candles) {
        try {
            // Compute MACD and Signal lines.
            const { macdLine, signalLine } = this.calculateMACDSeries(candles);
            // Filter out null values.
            const validMACD = macdLine.filter(v => v !== null);
            const validSignal = signalLine.filter(v => v !== null);
            // Ensure there are at least two valid values for crossover detection.
            if (validMACD.length < 2 || validSignal.length < 2) {
                return 'HOLD';
            }
            const prevMACD = validMACD[validMACD.length - 2];
            const currMACD = validMACD[validMACD.length - 1];
            const prevSignal = validSignal[validSignal.length - 2];
            const currSignal = validSignal[validSignal.length - 1];

            // Check for bullish crossover: MACD crosses above Signal.
            if (prevMACD < prevSignal && currMACD > currSignal) {
                return 'BUY';
            }
            // Check for bearish crossover: MACD crosses below Signal.
            if (prevMACD > prevSignal && currMACD < currSignal) {
                return 'SELL';
            }
            return 'HOLD';
        } catch (error) {
            console.error(`MACD error: ${error.message}`);
            return 'HOLD';
        }
    }
}

module.exports = MACD;
