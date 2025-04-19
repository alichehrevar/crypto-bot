// strategies/technical/Volume.js

const BaseIndicator = require("./BaseIndicator");

/**
 * Volume strategy based on average volume crossover.
 * Parameters:
 *  - period: lookback window for average volume (number >= 1)
 */
class Volume extends BaseIndicator {
    /**
     * @param {{ period: number }} params
     */
    constructor(params) {
        super(params);
        if (!params || typeof params.period !== 'number' || params.period < 1) {
            throw new Error('Volume indicator requires a numeric period >= 1');
        }
        this.period = params.period;
    }

    /**
     * Compute the average volume over the lookback window.
     * @param {Array<{ volume: number }>} candles
     * @returns {{ avgVolume: number }}
     */
    getMetrics(candles) {
        if (candles.length < this.period) {
            throw new Error(`Need at least ${this.period} candles for Volume`);
        }
        const window = candles.slice(-this.period);
        const sum = window.reduce((acc, c) => acc + c.volume, 0);
        const avgVolume = sum / this.period;
        return { avgVolume };
    }

    /**
     * Calculate the BUY/SELL/HOLD signal based on volume spikes/drops:
     * - BUY: current volume > 1.5 * avgVolume AND previous volume <= 1.5 * prevAvg
     * - SELL: current volume < 0.5 * avgVolume AND previous volume >= 0.5 * prevAvg
     * @param {Array<{ volume: number }>} candles
     * @returns {string}
     */
    calculateSignal(candles) {
        try {
            // Need at least period+1 candles to compare current vs prior
            if (candles.length < this.period + 1) {
                console.warn('Insufficient data for Volume signal');
                return 'HOLD';
            }

            // Metrics for a prior window and current window
            const priorWindow = candles.slice(0, -1);
            const priorMetrics = this.getMetrics(priorWindow);

            const currentMetrics = this.getMetrics(candles);

            const prevVol = candles[candles.length - 2].volume;
            const lastVol = candles[candles.length - 1].volume;

            // BUY condition
            if (lastVol > currentMetrics.avgVolume * 1.5 && prevVol <= priorMetrics.avgVolume * 1.5) {
                return 'BUY';
            }
            // SELL condition
            if (lastVol < currentMetrics.avgVolume * 0.5 && prevVol >= priorMetrics.avgVolume * 0.5) {
                return 'SELL';
            }
            return 'HOLD';
        } catch (err) {
            console.error(`Volume calculation failed: ${err.message}`);
            return 'HOLD';
        }
    }
}

module.exports = Volume;
