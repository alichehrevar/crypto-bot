const BaseIndicator = require('../technical/BaseIndicator');

class SimpleStrategy extends BaseIndicator {
    /**
     * A simple strategy that alternates between BUY and SELL signals.
     * This strategy ignores past trade outcomes and always signals to trade the available trade fund.
     *
     * @param {object} params - Configuration parameters (if any). Defaults can be provided.
     */
    constructor(params = {}) {
        super(params);
        // You might add any configuration parameters if needed.
        // For example, you could add a period for holding or similar, but here we keep it very simple.
    }

    /**
     * Returns a BUY signal on odd-numbered candles and a SELL signal on even-numbered candles.
     * This is a very basic and contrived logic to force trades.
     *
     * @param {Array} candles - An array of candle data.
     * @returns {string} 'BUY' or 'SELL'
     */
    calculateSignal(candles) {
        if (!candles || candles.length === 0) {
            return 'HOLD';
        }
        // Simple alternating logic: odd index -> BUY, even index -> SELL.
        return (candles.length % 2 === 1) ? 'BUY' : 'SELL';
    }

    /**
     * Optional: update configuration if needed.
     * For this simple strategy, we'll just merge any new config.
     *
     * @param {object} newConfig
     */
    updateConfig(newConfig) {
        Object.assign(this, newConfig);
        console.log('SimpleStrategy configuration updated:', newConfig);
    }
}

module.exports = SimpleStrategy;
