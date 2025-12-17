const BaseIndicator = require("./BaseIndicator");

class SmoothedHeikinAshi extends BaseIndicator {
    constructor(params = {}) {
        super(params);
        // Smoothed HA requires a period for the Moving Average (e.g., 10)
        this.period = params.period || 10;
    }

    /**
     * Helper to calculate SMMA (Smoothed Moving Average) or EMA
     * simplistic implementation for demonstration
     */
    calculateMA(values, period) {
        // Simple Moving Average for the first set
        // Exponential/Smoothed Moving Average for the rest
        // (You might already have a shared generic MA utility in your project)
        let result = [];
        let sum = 0;

        // Initial SMA
        for(let i=0; i < values.length; i++) {
            if(i < period - 1) {
                sum += values[i];
                result.push(null); // not enough data
            } else if (i === period - 1) {
                sum += values[i];
                result.push(sum / period);
            } else {
                // SMMA formula: (PrevSum - PrevAvg + Current) / Period
                // Or standard EMA formula depending on preference
                const prevAvg = result[i-1];
                const current = values[i];
                // Standard EMA formula for smoothing
                const k = 2 / (period + 1);
                const ema = (current - prevAvg) * k + prevAvg;
                result.push(ema);
            }
        }
        return result;
    }

    getMetrics(candles) {
        if (candles.length < this.period) {
            throw new Error("Not enough candles for Smoothed HA period");
        }

        // 1. EXTRACT DATA SERIES
        const opens = candles.map(c => c.open);
        const highs = candles.map(c => c.high);
        const lows = candles.map(c => c.low);
        const closes = candles.map(c => c.close);

        // 2. SMOOTH THE INPUTS (Pre-smoothing)
        const maOpen = this.calculateMA(opens, this.period);
        const maHigh = this.calculateMA(highs, this.period);
        const maLow = this.calculateMA(lows, this.period);
        const maClose = this.calculateMA(closes, this.period);

        const ha = [];

        // 3. APPLY HA FORMULA TO SMOOTHED VALUES
        for (let i = 0; i < candles.length; i++) {
            // Skip until we have valid MA data
            if (maOpen[i] === null) continue;

            const sOpen = maOpen[i];
            const sHigh = maHigh[i];
            const sLow = maLow[i];
            const sClose = maClose[i];

            if (ha.length === 0) {
                // First HA calculation based on first available smoothed data
                const haClose = (sOpen + sHigh + sLow + sClose) / 4;
                const haOpen = (sOpen + sClose) / 2;
                ha.push({ haOpen, haHigh: sHigh, haLow: sLow, haClose });
            } else {
                const prev = ha[ha.length - 1];
                const haClose = (sOpen + sHigh + sLow + sClose) / 4;
                const haOpen = (prev.haOpen + prev.haClose) / 2;
                const haHigh = Math.max(sHigh, haOpen, haClose);
                const haLow = Math.min(sLow, haOpen, haClose);
                ha.push({ haOpen, haHigh, haLow, haClose });
            }
        }
        return ha;
    }

    // calculateSignal remains the same, but operates on the smoother data
}

module.exports = SmoothedHeikinAshi;
