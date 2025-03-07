const BaseIndicator = require('../technical/BaseIndicator');

class KellyCriterionStrategy extends BaseIndicator {
    /**
     * @param {object} params - Configuration parameters.
     *   - probability: The estimated probability of winning (0 < p < 1).
     *   - riskRewardRatio: The net odds (e.g., a ratio of profit per unit risk).
     */
    constructor(params = { probability: 0.5, riskRewardRatio: 1 }) {
        super(params);
        if (!params || typeof params !== 'object') {
            throw new Error('KellyCriterionStrategy requires a configuration object');
        }
        this.probability = params.probability || 0.5;
        this.riskRewardRatio = params.riskRewardRatio || 1;
    }

    updateConfig(newConfig) {
        Object.assign(this, newConfig);
        if (newConfig.probability !== undefined) this.probability = newConfig.probability;
        if (newConfig.riskRewardRatio !== undefined) this.riskRewardRatio = newConfig.riskRewardRatio;
        console.log('KellyCriterionStrategy configuration updated:', newConfig);
    }

    /**
     * Calculates the optimal fraction of the bankroll to wager using the Kelly criterion.
     * Formula: f* = (b*p - (1-p)) / b.
     *
     * @param {number} balance - Current balance.
     * @param {number} price - Current price.
     * @returns {number} Position size in base currency.
     */
    calculatePositionSize(balance, price) {
        const p = this.probability;
        const b = this.riskRewardRatio;
        const q = 1 - p;
        const fraction = (b * p - q) / b;
        const optimalFraction = fraction > 0 ? fraction : 0;
        return (balance * optimalFraction) / price;
    }

    calculateSignal(candles) {
        // Kelly criterion is typically used for bet sizing rather than signal generation.
        return 'HOLD';
    }
}

module.exports = KellyCriterionStrategy;
