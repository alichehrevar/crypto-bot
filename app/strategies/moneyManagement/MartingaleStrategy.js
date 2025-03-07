const BaseIndicator = require('../technical/BaseIndicator');

class MartingaleStrategy extends BaseIndicator {
    /**
     * @param {object} params - Configuration parameters.
     *   - baseBet: The starting fraction of the balance to bet (e.g., 0.01 for 1%)
     *   - multiplier: The factor to multiply the bet after a loss (e.g., 2)
     */
    constructor(params = { baseBet: 0.01, multiplier: 2 }) {
        super(params);
        if (!params || typeof params !== 'object') {
            throw new Error('MartingaleStrategy requires a configuration object');
        }
        this.baseBet = params.baseBet || 0.01;
        this.multiplier = params.multiplier || 2;
        // Initialize current bet as the base bet.
        this.currentBet = this.baseBet;
    }

    /**
     * Updates the configuration parameters.
     * @param {object} newConfig
     */
    updateConfig(newConfig) {
        Object.assign(this, newConfig);
        if (newConfig.baseBet !== undefined) this.baseBet = newConfig.baseBet;
        if (newConfig.multiplier !== undefined) this.multiplier = newConfig.multiplier;
        // Optionally, reset current bet if desired.
        this.currentBet = this.baseBet;
        console.log('MartingaleStrategy configuration updated:', newConfig);
    }

    /**
     * Calculates the position size based on the outcome of the previous trade.
     * If the last trade was a loss, it multiplies the bet by the multiplier.
     * If the last trade was a win, it resets to the base bet.
     *
     * @param {string} lastTradeOutcome - 'win' or 'loss'
     * @param {number} balance - current balance
     * @param {number} price - current price
     * @returns {number} Position size in base currency.
     */
    calculatePositionSize(lastTradeOutcome, balance, price) {
        if (lastTradeOutcome === 'loss') {
            this.currentBet *= this.multiplier;
        } else if (lastTradeOutcome === 'win') {
            this.currentBet = this.baseBet;
        }
        // Calculate position size: fraction of balance divided by current price.
        return (balance * this.currentBet) / price;
    }

    // Martingale money management doesn't generate trade signals by itself.
    calculateSignal(candles) {
        return 'HOLD';
    }
}

module.exports = MartingaleStrategy;
