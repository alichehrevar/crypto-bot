// technical/RSI.js

// Import the BaseIndicator which contains common functionality for all technical.
const BaseIndicator = require('./BaseIndicator');

class RSI extends BaseIndicator {
    /**
     * Creates an instance of the RSI indicator.
     *
     * @param {Object} params - Configuration object for RSI.
     *   Required properties:
     *     - period: Number between 2 and 200 representing the lookback period.
     *     - overbought: Number (typically around 70) indicating the overbought threshold.
     *     - oversold: Number (typically around 30) indicating the oversold threshold.
     *
     * @throws {Error} If no configuration object is provided or if properties are invalid.
     */
    constructor(params) {
        // Do not assign a default value to params; force the user to supply a configuration.
        super(params);
        if (!params || typeof params !== 'object') {
            throw new Error('RSI strategy requires configuration object');
        }

        // Initialize configuration with provided values (or fallback defaults if desired).
        // (You may choose to remove fallback defaults if you want the user to explicitly supply all values.)
        this.period = params.period || 14;
        this.overbought = params.overbought || 70;
        this.oversold = params.oversold || 30;

        // Validate the period value.
        if (typeof this.period !== 'number' || this.period < 2 || this.period > 200) {
            throw new Error('Invalid period (2-200)');
        }

        // Validate overbought and oversold thresholds.
        if (this.overbought <= this.oversold || this.overbought > 100 || this.oversold < 0) {
            throw new Error('Invalid overbought/oversold levels');
        }
    }

    /**
     * updateConfig
     *
     * Updates the indicator's configuration dynamically.
     * This method merges new configuration values into the current instance and revalidates.
     *
     * @param {Object} newConfig - New configuration values.
     * @throws {Error} If updated configuration is invalid.
     */
    updateConfig(newConfig) {
        // Merge new configuration into the current instance.
        Object.assign(this, newConfig);
        // Revalidate the updated configuration.
        if (typeof this.period !== 'number' || this.period < 2 || this.period > 200) {
            throw new Error('Invalid period (2-200) after update');
        }
        if (this.overbought <= this.oversold || this.overbought > 100 || this.oversold < 0) {
            throw new Error('Invalid overbought/oversold levels after update');
        }
        console.log('RSI configuration updated:', newConfig);
    }

    /**
     * calculateRSI
     *
     * Calculates the RSI value using the standard Wilder's smoothing method.
     *
     * @param {Array<Object>} candles - Array of candle objects with a numeric "close" property.
     * @returns {number} The calculated RSI value.
     * @throws {Error} If insufficient data or invalid candle format is encountered.
     */
    calculateRSI(candles) {
        // Ensure there are enough candles for calculation.
        if (!candles || candles.length < this.period + 1) {
            throw new Error(`Need at least ${this.period + 1} candles for RSI calculation`);
        }
        // Extract closing prices and validate their format.
        const closes = candles.map(c => {
            if (typeof c.close !== 'number') {
                throw new Error('Invalid candle format - missing close price');
            }
            return c.close;
        });

        let avgGain = 0;
        let avgLoss = 0;

        // Compute initial simple moving average (SMA) for gains and losses.
        for (let i = 1; i <= this.period; i++) {
            const diff = closes[i] - closes[i - 1];
            avgGain += Math.max(diff, 0);
            avgLoss += Math.abs(Math.min(diff, 0));
        }
        avgGain /= this.period;
        avgLoss /= this.period;

        // Apply Wilder's smoothing to update the averages for subsequent candles.
        for (let i = this.period + 1; i < closes.length; i++) {
            const diff = closes[i] - closes[i - 1];
            const gain = Math.max(diff, 0);
            const loss = Math.abs(Math.min(diff, 0));
            avgGain = (avgGain * (this.period - 1) + gain) / this.period;
            avgLoss = (avgLoss * (this.period - 1) + loss) / this.period;
        }

        // If there is no loss, RSI is set to 100.
        if (avgLoss === 0) return 100;
        const rs = avgGain / avgLoss;
        // Return the RSI value rounded to two decimals.
        return Number((100 - (100 / (1 + rs))).toFixed(2));
    }

    /**
     * getMetrics
     *
     * Returns detailed RSI metrics based on the provided candles.
     *
     * @param {Array<Object>} candles - Array of candle objects.
     * @returns {Object} An object containing the RSI value and thresholds.
     */
    getMetrics(candles) {
        const rsi = this.calculateRSI(candles);
        return {
            rsi,
            overbought: this.overbought,
            oversold: this.oversold,
            period: this.period,
            status: rsi > this.overbought ? 'overbought' : rsi < this.oversold ? 'oversold' : 'neutral'
        };
    }

    /**
     * calculateSignal
     *
     * Determines a trading signal based on the RSI value.
     * It compares the current RSI with the oversold and overbought thresholds and checks for a crossover.
     *
     * @param {Array<Object>} candles - Array of candle objects.
     * @returns {string} 'BUY', 'SELL', or 'HOLD'
     */
    calculateSignal(candles) {
        try {
            // Ensure sufficient data is available (using twice the period for safety).
            if (candles.length < this.period * 2) {
                console.warn('Insufficient data for reliable RSI signal');
                return 'HOLD';
            }
            // Calculate the current RSI and the RSI of all candles except the last one.
            const rsi = this.calculateRSI(candles);
            const prevRSI = this.calculateRSI(candles.slice(0, -1));
            // Determine if a crossover has occurred.
            if (rsi < this.oversold && prevRSI >= this.oversold) {
                return 'BUY';
            }
            if (rsi > this.overbought && prevRSI <= this.overbought) {
                return 'SELL';
            }
            return 'HOLD';
        } catch (error) {
            console.error(`RSI calculation failed: ${error.message}`);
            return 'HOLD';
        }
    }
}

module.exports = RSI;
