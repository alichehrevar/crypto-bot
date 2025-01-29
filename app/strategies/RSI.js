const BaseStrategy = require('./BaseStrategy');

class RSI extends BaseStrategy {
    constructor(params) {
        super(params);
        this.period = params.period || 14;
        this.overbought = params.overbought || 70;
        this.oversold = params.oversold || 30;
    }

    calculateRSI(candles) {
        const closes = candles.map(c => c.close);
        const gains = [];
        const losses = [];

        // Calculate gains and losses
        for (let i = 1; i < closes.length; i++) {
            const difference = closes[i] - closes[i - 1];
            gains.push(Math.max(difference, 0));
            losses.push(Math.max(-difference, 0));
        }

        // Calculate average gains and losses
        const avgGain = this.calculateAverage(gains, this.period);
        const avgLoss = this.calculateAverage(losses, this.period);

        // Handle division by zero
        if (avgLoss === 0) return 100;
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    calculateAverage(arr, period) {
        let sum = arr.slice(0, period).reduce((a, b) => a + b, 0);
        const averages = [sum / period];

        for (let i = period; i < arr.length; i++) {
            sum = sum - averages[0] + arr[i];
            averages.push(sum / period);
        }

        return averages[averages.length - 1];
    }

    calculateSignal(candles) {
        if (candles.length < this.period + 1) return 'HOLD';

        const rsi = this.calculateRSI(candles);

        if (rsi < this.oversold) return 'BUY';
        if (rsi > this.overbought) return 'SELL';
        return 'HOLD';
    }
}

module.exports = RSI;
