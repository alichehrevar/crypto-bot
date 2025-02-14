const BaseStrategy = require('./BaseIndicator');

class MACrossover extends BaseStrategy {
    constructor(params) {
        super(params);

        if (!params || typeof params !== 'object') {
            throw new Error('MACrossover strategy requires configuration object');
        }

        this.shortPeriod = params.shortPeriod;
        this.longPeriod = params.longPeriod;

        if (typeof this.shortPeriod !== 'number' || typeof this.longPeriod !== 'number') {
            throw new Error('shortPeriod and longPeriod must be numbers');
        }

        if (this.shortPeriod <= 0 || this.longPeriod <= 0) {
            throw new Error('shortPeriod and longPeriod must be > 0');
        }

        if (this.shortPeriod >= this.longPeriod) {
            console.warn(
                'Typically, shortPeriod should be less than longPeriod for a crossover strategy.'
            );
        }
    }

    // Simple Moving Average for the last `period` candles
    calculateSMA(candles, period) {
        if (candles.length < period) {
            throw new Error(`Not enough candles to calculate an SMA of period ${period}`);
        }
        const slice = candles.slice(-period);
        const sum = slice.reduce((acc, candle) => acc + candle.close, 0);
        return sum / period;
    }

    getMetrics(candles) {
        if (candles.length < this.longPeriod) {
            return {
                shortMA: null,
                longMA: null,
                status: 'Insufficient data'
            };
        }

        const shortMA = this.calculateSMA(candles, this.shortPeriod);
        const longMA  = this.calculateSMA(candles, this.longPeriod);

        let status;
        if (shortMA > longMA) {
            status = 'Short MA above Long MA (BUY Zone)';
        } else if (shortMA < longMA) {
            status = 'Short MA below Long MA (SELL Zone)';
        } else {
            status = 'Short MA equals Long MA (Neutral)';
        }

        return {
            shortMA,
            longMA,
            status
        };
    }

    calculateSignal(candles) {
        try {
            // We need at least `longPeriod + 1` candles to detect a recent crossover
            // (the +1 is so we can also check "previous" shortMA and longMA)
            if (candles.length < this.longPeriod + 1) {
                console.warn('Insufficient data for reliable MA crossover signal');
                return 'HOLD';
            }

            const shortMA = this.calculateSMA(candles, this.shortPeriod);
            const longMA  = this.calculateSMA(candles, this.longPeriod);

            // Calculate previous MAs (using one less candle)
            const prevShortMA = this.calculateSMA(candles.slice(0, -1), this.shortPeriod);
            const prevLongMA  = this.calculateSMA(candles.slice(0, -1), this.longPeriod);

            // Check for crossover
            const crossedAbove = shortMA > longMA && prevShortMA <= prevLongMA;
            const crossedBelow = shortMA < longMA && prevShortMA >= prevLongMA;

            if (crossedAbove) {
                return 'BUY';
            } else if (crossedBelow) {
                return 'SELL';
            } else {
                // No new crossover => HOLD
                return 'HOLD';
            }
        } catch (error) {
            console.error(`MACrossover error: ${error.message}`);
            return 'HOLD';
        }
    }
}

module.exports = MACrossover;
