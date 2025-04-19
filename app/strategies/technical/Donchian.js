const BaseIndicator = require('./BaseIndicator');

class Donchian extends BaseIndicator {
    /**
     * @param {{ period: number }} params
     *   period: look‑back window size for the channel
     */
    constructor(params) {
        super(params);
        if (!params || typeof params.period !== 'number' || params.period < 1) {
            throw new Error('Donchian requires a numeric period ≥ 1');
        }
        this.period = params.period;
    }

    /**
     * Compute the Donchian bands (upper, lower, middle).
     * @param {Array<{ high: number, low: number }>} candles
     */
    getMetrics(candles) {
        if (candles.length < this.period) {
            throw new Error(`Need at least ${this.period} candles for Donchian`);
        }

        // Take the last `period` candles
        const slice = candles.slice(-this.period);
        const highs = slice.map(c => c.high);
        const lows = slice.map(c => c.low);

        const upper = Math.max(...highs);
        const lower = Math.min(...lows);
        const middle = (upper + lower) / 2;

        return { upper, lower, middle };
    }

    /**
     * Returns 'BUY', 'SELL', or 'HOLD' based on middle-band crossover.
     * @param {Array<{ close: number, high?:number, low?:number }>} candles
     */
    calculateSignal(candles) {
        try {
            // Need at least period+1 to compare current vs prior
            if (candles.length < this.period + 1) {
                console.warn('Not enough data for Donchian signal');
                return 'HOLD';
            }

            // Compute bands for the prior candle window and for the current window
            const priorWindow = candles.slice(0, -1);
            const priorMetrics = this.getMetrics(priorWindow);


             // includes the new closed candle
            const currentMetrics = this.getMetrics(candles);

            const prevClose = candles[candles.length - 2].close;
            const lastClose = candles[candles.length - 1].close;

            // BUY: price crosses above the prior middle
            if (lastClose > currentMetrics.middle && prevClose <= priorMetrics.middle) {
                return 'BUY';
            }
            // SELL: price crosses below the prior middle
            if (lastClose < currentMetrics.middle && prevClose >= priorMetrics.middle) {
                return 'SELL';
            }
            return 'HOLD';
        } catch (err) {
            console.error(`Donchian calculation error: ${err.message}`);
            return 'HOLD';
        }
    }
}

module.exports = Donchian;
