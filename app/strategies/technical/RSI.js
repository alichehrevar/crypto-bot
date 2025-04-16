// strategies/technical/RSI.js

// Import the BaseIndicator which contains common functionality for all technical indicators.
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
        super(params);
        if (!params || typeof params !== 'object') {
            throw new Error('RSI indicator requires a configuration object.');
        }
        // Set the period, overbought, and oversold values from the provided parameters.
        // (Fallback defaults are provided here; you may remove them if you want users to supply all values explicitly.)
        this.period = params.period || 14;
        this.overbought = params.overbought || 70;
        this.oversold = params.oversold || 30;

        // Validate configuration values.
        if (typeof this.period !== 'number' || this.period < 2 || this.period > 200) {
            throw new Error('Invalid RSI period (must be between 2 and 200).');
        }
        if (this.overbought <= this.oversold || this.overbought > 100 || this.oversold < 0) {
            throw new Error('Invalid overbought/oversold thresholds. Ensure that overbought > oversold, overbought ≤ 100, and oversold ≥ 0.');
        }
    }

    /**
     * updateConfig
     *
     * Dynamically updates the indicator's configuration.
     * Merges new configuration values into the existing instance and validates them.
     *
     * @param {Object} newConfig - New configuration values to merge.
     * @throws {Error} If the updated configuration is invalid.
     */
    updateConfig(newConfig) {
        Object.assign(this, newConfig);
        if (typeof this.period !== 'number' || this.period < 2 || this.period > 200) {
            throw new Error('Invalid RSI period (must be between 2 and 200) after update.');
        }
        if (this.overbought <= this.oversold || this.overbought > 100 || this.oversold < 0) {
            throw new Error('Invalid overbought/oversold thresholds after update.');
        }
        console.log('RSI configuration updated:', newConfig);
    }

    /**
     * calculateRSI
     *
     * Calculates the RSI value using the standard Wilder's smoothing method.
     *
     * @param {Array<Object>} candles - Array of candle objects that must include a numeric "close" property.
     * @returns {number} The calculated RSI value rounded to two decimals.
     * @throws {Error} If insufficient data or invalid candle format is encountered.
     */
    calculateRSI(candles) {
        if (!candles || candles.length < this.period + 1) {
            throw new Error(`At least ${this.period + 1} candles are required for RSI calculation.`);
        }

        // Extract closing prices from the candles.
        const closes = candles.map(c => {
            if (typeof c.close !== 'number') {
                throw new Error('Invalid candle format: missing numeric close price.');
            }
            return c.close;
        });

        let avgGain = 0;
        let avgLoss = 0;

        // Calculate initial simple moving average for gains and losses.
        for (let i = 1; i <= this.period; i++) {
            const diff = closes[i] - closes[i - 1];
            avgGain += Math.max(diff, 0);
            avgLoss += Math.abs(Math.min(diff, 0));
        }
        avgGain /= this.period;
        avgLoss /= this.period;

        // Apply Wilder's smoothing for subsequent price changes.
        for (let i = this.period + 1; i < closes.length; i++) {
            const diff = closes[i] - closes[i - 1];
            const gain = Math.max(diff, 0);
            const loss = Math.abs(Math.min(diff, 0));
            avgGain = (avgGain * (this.period - 1) + gain) / this.period;
            avgLoss = (avgLoss * (this.period - 1) + loss) / this.period;
        }

        // If there is no loss, return RSI as 100.
        if (avgLoss === 0) return 100;
        const rs = avgGain / avgLoss;
        return Number((100 - (100 / (1 + rs))).toFixed(2));
    }

    /**
     * getMetrics
     *
     * Returns detailed RSI metrics based on the provided candles.
     *
     * @param {Array<Object>} candles - Array of candle objects.
     * @returns {Object} An object containing the RSI value, thresholds, period, and a status indicator.
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
     * Determines the trading signal ('BUY', 'SELL', or 'HOLD') based on the RSI values.
     * It calculates the current RSI and a previous RSI (excluding the latest candle) to determine if
     * a crossover has occurred.
     *
     * @param {Array<Object>} candles - Array of candle objects.
     * @returns {string} 'BUY', 'SELL', or 'HOLD'
     */
    calculateSignal(candles) {
        console.log('RSI.calculateSignal called with candles:', candles);
        try {
            // Ensure sufficient candles are provided. Optionally adjust the required length if needed.
            if (candles.length < this.period * 2) {
                console.warn('Insufficient data for reliable RSI signal; defaulting to HOLD.');
                return 'HOLD';
            }

            // Calculate RSI based on all candles and then without the most recent update.
            const rsi = this.calculateRSI(candles);
            const prevRSI = this.calculateRSI(candles.slice(0, -1));
            const metrics = this.getMetrics(candles);
            console.log('Calculated RSI:', [rsi, prevRSI]);

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
