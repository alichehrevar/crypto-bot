const BaseIndicator = require('../../indicators/BaseIndicator');

class MirroredMartingaleStrategy extends BaseIndicator {
    /**
     * @param {object} params - Configuration parameters.
     *   - baseBet: The starting bet fraction.
     *   - multiplier: The factor to multiply after a win.
     */
    constructor(params = { baseBet: 0.01, multiplier: 2 }) {
        super(params);
        if (!params || typeof params !== 'object') {
            throw new Error('MirroredMartingaleStrategy requires a configuration object');
        }
        this.baseBet = params.baseBet || 0.01;
        this.multiplier = params.multiplier || 2;
        this.currentBet = this.baseBet;
    }

    updateConfig(newConfig) {
        Object.assign(this, newConfig);
        if (newConfig.baseBet !== undefined) this.baseBet = newConfig.baseBet;
        if (newConfig.multiplier !== undefined) this.multiplier = newConfig.multiplier;
        // Optionally reset currentBet.
        this.currentBet = this.baseBet;
        console.log('MirroredMartingaleStrategy configuration updated:', newConfig);
    }

    /**
     * Calculates position size using mirrored logic.
     * In this example, if the last trade was a win, you increase the bet by the multiplier.
     * If the last trade was a loss, you reset to the base bet.
     *
     * @param {string} lastTradeOutcome - 'win' or 'loss'
     * @param {number} balance - current balance
     * @param {number} price - current price
     * @returns {number} Position size in base currency.
     */
    calculatePositionSize(lastTradeOutcome, balance, price) {
        if (lastTradeOutcome === 'win') {
            this.currentBet *= this.multiplier;
        } else if (lastTradeOutcome === 'loss') {
            this.currentBet = this.baseBet;
        }
        return (balance * this.currentBet) / price;
    }

    calculateSignal(candles) {
        return 'HOLD';
    }
}

module.exports = MirroredMartingaleStrategy;
