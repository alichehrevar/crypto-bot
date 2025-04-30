// technical/MovingAverageCrossover.js

// Import the base indicator class.
const BaseIndicator = require('./BaseIndicator');

class MACrossover extends BaseIndicator {
    /**
     * Creates an instance of the Moving Average Crossover indicator.
     *
     * @param {Object} params - Configuration object.
     *   Required properties:
     *     - shortPeriod: Number (e.g., 5)
     *     - longPeriod: Number (e.g., 20)
     *
     * @throws {Error} If no configuration object is provided.
     */
    constructor(params) {
        super(params);
        // Throw an error if no configuration object is provided.
        if (!params || typeof params !== 'object') {
            throw new Error('MACrossover strategy requires configuration object');
        }
        // Initialize configuration values.
        this.shortPeriod = params.shortPeriod;
        this.longPeriod = params.longPeriod;

        // Validate that both shortPeriod and longPeriod are numbers.
        if (typeof this.shortPeriod !== 'number' || typeof this.longPeriod !== 'number') {
            throw new Error('shortPeriod and longPeriod must be numbers');
        }
        // Validate that both are greater than zero.
        if (this.shortPeriod <= 0 || this.longPeriod <= 0) {
            throw new Error('shortPeriod and longPeriod must be > 0');
        }
        // Warn if shortPeriod is not less than longPeriod.
        if (this.shortPeriod >= this.longPeriod) {
            console.warn('Typically, shortPeriod should be less than longPeriod for a crossover strategy.');
        }
    }

    /**
     * updateConfig
     *
     * Dynamically updates the indicator's configuration.
     *
     * @param {Object} newConfig - New configuration values to merge.
     * @throws {Error} If the updated configuration is invalid.
     */
    updateConfig(newConfig) {
        // Merge new configuration values into the current instance.
        Object.assign(this, newConfig);
        // Validate updated configuration.
        if (typeof this.shortPeriod !== 'number' || typeof this.longPeriod !== 'number') {
            throw new Error('shortPeriod and longPeriod must be numbers after update');
        }
        if (this.shortPeriod <= 0 || this.longPeriod <= 0) {
            throw new Error('shortPeriod and longPeriod must be > 0 after update');
        }
        if (this.shortPeriod >= this.longPeriod) {
            console.warn('Typically, shortPeriod should be less than longPeriod for a crossover strategy.');
        }
        console.log('MACrossover configuration updated:', newConfig);
    }

    /**
     * calculateSMA
     *
     * Calculates the Simple Moving Average (SMA) for the last "period" candles.
     *
     * @param {Array} candles - Array of candle objects.
     * @param {number} period - The number of candles over which to calculate the SMA.
     * @returns {number} The computed SMA.
     * @throws {Error} If there are not enough candles.
     */
    calculateSMA(candles, period) {
        if (candles.length < period) {
            throw new Error(`Not enough candles to calculate an SMA of period ${period}`);
        }
        const slice = candles.slice(-period);
        const sum = slice.reduce((acc, candle) => acc + candle.close, 0);
        return sum / period;
    }

    /**
     * getMetrics
     *
     * Calculates both the short and long moving averages and returns status information.
     *
     * @param {Array} candles - Array of candle objects.
     * @returns {Object} An object containing shortMA, longMA, and a status string.
     */
    getMetrics(candles) {
        if (candles.length < this.longPeriod) {
            return {
                shortMA: null,
                longMA: null,
                status: 'Insufficient data'
            };
        }
        const shortMA = this.calculateSMA(candles, this.shortPeriod);
        const longMA = this.calculateSMA(candles, this.longPeriod);
        let status;
        if (shortMA > longMA) {
            status = 'Short MA above Long MA (BUY Zone)';
        } else if (shortMA < longMA) {
            status = 'Short MA below Long MA (SELL Zone)';
        } else {
            status = 'Short MA equals Long MA (Neutral)';
        }
        return { shortMA, longMA, status };
    }

    /**
     * calculateSignal
     *
     * Determines the trading signal based on moving average crossovers.
     * It computes the current and previous short and long moving averages, then checks for a crossover.
     *
     * @param {Array} candles - Array of candle objects.
     * @returns {string} 'BUY', 'SELL', or 'HOLD'
     */
    calculateSignal(candles) {
        try {
            // Require at least longPeriod + 1 candles for a valid signal.
            if (candles.length < this.longPeriod + 1) {
                console.warn('Insufficient data for reliable MA crossover signal');
                return 'HOLD';
            }
            // Calculate current moving averages.
            const shortMA = this.calculateSMA(candles, this.shortPeriod);
            const longMA = this.calculateSMA(candles, this.longPeriod);
            // Calculate previous moving averages (excluding the last candle).
            const prevShortMA = this.calculateSMA(candles.slice(0, -1), this.shortPeriod);
            const prevLongMA = this.calculateSMA(candles.slice(0, -1), this.longPeriod);
            // Check for bullish crossover.
            const crossedAbove = shortMA > longMA && prevShortMA <= prevLongMA;
            // Check for bearish crossover.
            const crossedBelow = shortMA < longMA && prevShortMA >= prevLongMA;

            console.log('Calculated MAC prevShortMA:', prevShortMA, 'prevLongMA:', prevLongMA, 'shortMA:', shortMA, 'longMA:', longMA);

            if (crossedAbove) {
                return 'BUY';
            } else if (crossedBelow) {
                return 'SELL';
            } else {
                return 'HOLD';
            }
        } catch (error) {
            console.error(`MACrossover error: ${error.message}`);
            return 'HOLD';
        }
    }
}

module.exports = MACrossover;
