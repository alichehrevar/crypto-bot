// strategies/technical/CombinedRsiMacd.js

const BaseIndicator = require("./BaseIndicator");
const RSI = require("./RSI");
const MACD = require("./MACD");

/**
 * Combined RSI & MACD indicator class.
 * Generates BUY/SELL/HOLD signal when both RSI and MACD confirm within a window.
 */
class CombinedRsiMacd extends BaseIndicator {
    /**
     * @param {Object} params
     *   - confirmation_window: number of candles to wait for confirmation
     *   - other parameters passed to RSI & MACD
     */
    constructor(params) {
        super(params);
        this.confirmationWindow =
            (params.parameters && params.parameters.confirmation_window) || 6;
        // prepare sub-indicators
        this.rsiParams = params.parameters?.rsi || {};
        this.macdParams = params.parameters?.macd || {};
    }

    /**
     * calculateSignal
     * @param {Array<Object>} candles
     * @returns {string} 'BUY' | 'SELL' | 'HOLD'
     */
    calculateSignal(candles) {
        try {
            const len = candles.length;
            if (len < 2) return "HOLD";

            // initialize pending counters
            let pendingRsi = { BUY: 0, SELL: 0 };
            let pendingMacd = { BUY: 0, SELL: 0 };

            // iterate through candles to update pending
            for (let i = 1; i < len; i++) {
                // RSI
                const rsiInst = new RSI(this.rsiParams);
                const rsiPrev = rsiInst.calculateRSI(candles.slice(0, i + 0));
                const rsiCurr = rsiInst.calculateRSI(candles.slice(0, i + 1));
                const rsiOver = this.params.parameters?.rsi?.overbought || rsiInst.overbought;
                const rsiUnder = this.params.parameters?.rsi?.oversold || rsiInst.oversold;
                if (rsiPrev <= rsiUnder && rsiCurr > rsiUnder) pendingRsi.BUY = this.confirmationWindow;
                else if (rsiPrev >= rsiOver && rsiCurr < rsiOver) pendingRsi.SELL = this.confirmationWindow;

                // MACD
                const macdInst = new MACD(this.macdParams);
                const macdPrev = macdInst.calculateMACD(candles.slice(0, i + 0));
                const macdCurr = macdInst.calculateMACD(candles.slice(0, i + 1));
                // calculateMACD returns { macd, signal }
                if (macdPrev.macd <= macdPrev.signal && macdCurr.macd > macdCurr.signal)
                    pendingMacd.BUY = this.confirmationWindow;
                else if (macdPrev.macd >= macdPrev.signal && macdCurr.macd < macdCurr.signal)
                    pendingMacd.SELL = this.confirmationWindow;

                // decrement
                if (pendingRsi.BUY > 0) pendingRsi.BUY--;
                if (pendingRsi.SELL > 0) pendingRsi.SELL--;
                if (pendingMacd.BUY > 0) pendingMacd.BUY--;
                if (pendingMacd.SELL > 0) pendingMacd.SELL--;
            }

            // final combined
            if (pendingRsi.BUY > 0 && pendingMacd.BUY > 0) return "BUY";
            if (pendingRsi.SELL > 0 && pendingMacd.SELL > 0) return "SELL";
            return "HOLD";
        } catch (err) {
            console.error(`CombinedRsiMacd failure: ${err.message}`);
            return "HOLD";
        }
    }
}

module.exports = CombinedRsiMacd;
