const BaseStrategy = require('./BaseStrategy');

class MACrossover extends BaseStrategy {
    constructor(params) {
        super(params);
        this.shortPeriod = params.shortPeriod;
        this.longPeriod = params.longPeriod;
    }

    calculateSMA(candles, period) {
        return candles.slice(-period)
            .reduce((sum, candle) => sum + candle.close, 0) / period;
    }

    calculateSignal(candles) {
        const shortMA = this.calculateSMA(candles, this.shortPeriod);
        const longMA = this.calculateSMA(candles, this.longPeriod);
        return shortMA > longMA ? 'BUY' : 'SELL';
    }
}

module.exports = MACrossover;
