const BaseIndicator = require('./BaseIndicator');

class MACD extends BaseIndicator {
    constructor(params = { shortPeriod: 12, longPeriod: 26, signalPeriod: 9 }) {
        super(params);
        if (!params || typeof params !== 'object') {
            throw new Error('MACD strategy requires a parameter object');
        }
        this.shortPeriod = params.shortPeriod || 12;
        this.longPeriod = params.longPeriod || 26;
        this.signalPeriod = params.signalPeriod || 9;

        if (this.shortPeriod <= 0 || this.longPeriod <= 0 || this.signalPeriod <= 0) {
            throw new Error('MACD periods must be > 0');
        }
        if (this.shortPeriod >= this.longPeriod) {
            console.warn('Usually, shortPeriod < longPeriod for MACD');
        }
    }

    updateConfig(newConfig) {
        Object.assign(this, newConfig);
        if (this.shortPeriod <= 0 || this.longPeriod <= 0 || this.signalPeriod <= 0) {
            throw new Error('MACD periods must be > 0 after update');
        }
        if (this.shortPeriod >= this.longPeriod) {
            console.warn('Usually, shortPeriod < longPeriod for MACD');
        }
        console.log('MACD configuration updated:', newConfig);
    }

    calculateEMA(values, period) {
        const k = 2 / (period + 1);
        const emaArr = Array(values.length).fill(null);
        if (values.length < period) return emaArr;
        const initialSlice = values.slice(0, period);
        const sum = initialSlice.reduce((acc, v) => acc + v, 0);
        let prevEma = sum / period;
        emaArr[period - 1] = prevEma;
        for (let i = period; i < values.length; i++) {
            const val = values[i];
            prevEma = (val - prevEma) * k + prevEma;
            emaArr[i] = prevEma;
        }
        return emaArr;
    }

    calculateMACDSeries(candles) {
        if (!Array.isArray(candles) || candles.length < this.longPeriod + this.signalPeriod) {
            throw new Error(`Need at least ${this.longPeriod + this.signalPeriod} candles`);
        }
        const closes = candles.map(c => c.close);
        const shortEMA = this.calculateEMA(closes, this.shortPeriod);
        const longEMA = this.calculateEMA(closes, this.longPeriod);
        const macdLine = closes.map((_, i) => {
            if (i < this.longPeriod - 1) return null;
            return shortEMA[i] - longEMA[i];
        });
        const validMACD = macdLine.filter(v => v !== null);
        const signalEMA = this.calculateEMA(validMACD, this.signalPeriod);
        const offset = macdLine.length - validMACD.length;
        const signalLine = macdLine.map((_, i) => (i >= offset ? signalEMA[i - offset] : null));
        return { macdLine, signalLine };
    }

    calculateSignal(candles) {
        try {
            const { macdLine, signalLine } = this.calculateMACDSeries(candles);
            const validMACD = macdLine.filter(v => v !== null);
            const validSignal = signalLine.filter(v => v !== null);
            if (validMACD.length < 2 || validSignal.length < 2) {
                return 'HOLD';
            }
            const prevMACD = validMACD[validMACD.length - 2];
            const currMACD = validMACD[validMACD.length - 1];
            const prevSignal = validSignal[validSignal.length - 2];
            const currSignal = validSignal[validSignal.length - 1];

            if (prevMACD < prevSignal && currMACD > currSignal) {
                return 'BUY';
            }
            if (prevMACD > prevSignal && currMACD < currSignal) {
                return 'SELL';
            }
            return 'HOLD';
        } catch (error) {
            console.error(`MACD error: ${error.message}`);
            return 'HOLD';
        }
    }
}

module.exports = MACD;
