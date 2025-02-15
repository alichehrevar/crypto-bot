const BaseIndicator = require('./BaseIndicator');

class RSI extends BaseIndicator {
    constructor(params = { period: 14, overbought: 70, oversold: 30 }) {
        super(params);
        if (!params || typeof params !== 'object') {
            throw new Error('RSI strategy requires configuration object');
        }
        this.period = params.period || 14;
        this.overbought = params.overbought || 70;
        this.oversold = params.oversold || 30;

        if (typeof this.period !== 'number' || this.period < 2 || this.period > 200) {
            throw new Error('Invalid period (2-200)');
        }
        if (this.overbought <= this.oversold || this.overbought > 100 || this.oversold < 0) {
            throw new Error('Invalid overbought/oversold levels');
        }
    }

    updateConfig(newConfig) {
        // Merge the new config into the current instance.
        Object.assign(this, newConfig);
        // Optionally, you can revalidate the configuration here.
        if (typeof this.period !== 'number' || this.period < 2 || this.period > 200) {
            throw new Error('Invalid period (2-200) after update');
        }
        if (this.overbought <= this.oversold || this.overbought > 100 || this.oversold < 0) {
            throw new Error('Invalid overbought/oversold levels after update');
        }
        console.log('RSI configuration updated:', newConfig);
    }

    calculateRSI(candles) {
        if (!candles || candles.length < this.period + 1) {
            throw new Error(`Need at least ${this.period + 1} candles for RSI calculation`);
        }
        const closes = candles.map(c => {
            if (typeof c.close !== 'number') {
                throw new Error('Invalid candle format - missing close price');
            }
            return c.close;
        });

        let avgGain = 0;
        let avgLoss = 0;

        // Initial SMA for gains and losses.
        for (let i = 1; i <= this.period; i++) {
            const diff = closes[i] - closes[i - 1];
            avgGain += Math.max(diff, 0);
            avgLoss += Math.abs(Math.min(diff, 0));
        }
        avgGain /= this.period;
        avgLoss /= this.period;

        // Subsequent Wilder's smoothing.
        for (let i = this.period + 1; i < closes.length; i++) {
            const diff = closes[i] - closes[i - 1];
            const gain = Math.max(diff, 0);
            const loss = Math.abs(Math.min(diff, 0));
            avgGain = (avgGain * (this.period - 1) + gain) / this.period;
            avgLoss = (avgLoss * (this.period - 1) + loss) / this.period;
        }

        if (avgLoss === 0) return 100;
        const rs = avgGain / avgLoss;
        return Number((100 - (100 / (1 + rs))).toFixed(2));
    }

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

    calculateSignal(candles) {
        try {
            if (candles.length < this.period * 2) {
                console.warn('Insufficient data for reliable RSI signal');
                return 'HOLD';
            }
            const rsi = this.calculateRSI(candles);
            const prevRSI = this.calculateRSI(candles.slice(0, -1));
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
