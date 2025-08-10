// app/services/backtestService/BacktestSignalProcessor.js

const { RSI, SMA } = require('@debut/indicators');

class BacktestSignalProcessor {
    constructor(name, params = {}) {
        this.name = name;
        this.params = params;
        this.indicatorInstance = this._createIndicatorInstance();
    }

    _createIndicatorInstance() {
        switch (this.name) {
            case 'RSI':
                return new RSI(this.params.period || 14);
            case 'SMA_CROSS':
                return {
                    fast: new SMA(this.params.fast || 10),
                    slow: new SMA(this.params.slow || 50),
                };
            default:
                console.error(`[SignalProcessor] Indicator "${this.name}" is not supported.`);
                return null;
        }
    }

    // NEW: unified step for different indicator APIs
    _step(ind, price) {
        if (!ind) return undefined;
        if (typeof ind.nextValue === 'function') return ind.nextValue(price);
        if (typeof ind.next === 'function')      return ind.next(price);
        if (typeof ind === 'function')           return ind(price);
        return undefined;
    }

    next(candle) {
        if (!this.indicatorInstance) return 'HOLD';

        let indicatorValue;
        if (this.name === 'SMA_CROSS') {
            indicatorValue = {
                fast: this._step(this.indicatorInstance.fast, candle.close),
                slow: this._step(this.indicatorInstance.slow, candle.close),
            };
        } else {
            indicatorValue = this._step(this.indicatorInstance, candle.close);
        }
        return this._signal(indicatorValue);
    }

    _signal(value) {
        switch (this.name) {
            case 'RSI':       return this._rsiSignal(value);
            case 'SMA_CROSS': return this._smaCrossSignal(value);
            default:          return 'HOLD';
        }
    }

    _rsiSignal(lastRsi) {
        if (lastRsi === undefined) return 'HOLD';
        if (lastRsi < (this.params.oversold || 30)) return 'BUY';
        if (lastRsi > (this.params.overbought || 70)) return 'SELL';
        return 'HOLD';
    }

    _smaCrossSignal(values) {
        const { fast, slow } = values;
        if (fast === undefined || slow === undefined) return 'HOLD';
        if (fast > slow) return 'BUY';
        if (fast < slow) return 'SELL';
        return 'HOLD';
    }
}

module.exports = BacktestSignalProcessor;
