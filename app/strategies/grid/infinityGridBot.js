// app/strategies/grid/infinityGridBot.js

/*
 * infinityGridBot.js
 *
 * Extends GridBot for an infinite grid strategy that adapts continuously.
 */

const GridBot = require('./gridBot');
const logger  = require('../../../logs/gridLogger');

class InfinityGridBot extends GridBot {
    constructor(config, exchange) {
        super(config, exchange);

        // Percent‐based step for infinite grid (overrides fixed‐spacing)
        this.gridStepPercentage = config.gridStepPercentage != null ? config.gridStepPercentage : 0.01;

        // If true, use Bollinger Bands dynamically for upper/lower
        this.useBollinger = config.useBollinger || false;
    }

    /**
     * Override initGrid:
     * - If using Bollinger, compute bands and set lowerPrice/upperPrice accordingly.
     * - Otherwise, if using simple % step, leave gridSpacing null (percent logic in getNextXPrice).
     * - Else, defer to base initGrid (fixed or legacy percentage).
     */
    initGrid() {
        if (this.useBollinger) {
            const { lowerBand, upperBand } = this.computeBollingerBands();
            this.lowerPrice = lowerBand;
            this.upperPrice = upperBand;
            logger.info({
                event: 'INIT_INFINITY_GRID_BB',
                botId: this.id,
                symbol: this.symbol,
                lowerBand,
                upperBand
            });
            // We still compute a nominal gridSpacing so base calls do not break:
            this.gridSpacing = (upperBand - lowerBand) / this.gridCount;
        }
        else if (this.gridStepPercentage != null) {
            // In an “infinite” % grid, we do not set fixed spacing here.
            // Spacing is computed on‐the‐fly in getNextBuyPrice / getNextSellPrice.
            this.gridSpacing = null;
            logger.info({
                event: 'INIT_INFINITY_GRID',
                botId: this.id,
                symbol: this.symbol,
                stepPct: this.gridStepPercentage
            });
        }
        else {
            // Fallback to fixed or normal percentage logic
            super.initGrid();
        }
    }

    /**
     * Compute Bollinger Bands over the last N candles. Placeholder logic:
     * - You need to supply recent price history (e.g. from candleStore).
     */
    computeBollingerBands() {
        // Fetch recent candles for this.symbol & timeframe from a shared store or DB:
        // For example:
        // const recent = candleStore.getLatestCandles(this.symbol, this.timeframe, 20).map(c => c.close);
        // But since we don’t have candleStore here, we use an empty array placeholder.
        const prices = [];

        if (!prices.length) {
            // If no data, return existing bounds
            return {
                lowerBand: this.lowerPrice != null ? this.lowerPrice : 0,
                upperBand: this.upperPrice != null ? this.upperPrice : 0
            };
        }

        const period = 20;
        const slice = prices.slice(-period);
        const sum = slice.reduce((acc, p) => acc + p, 0);
        const mean = sum / slice.length;
        const variance = slice.reduce((acc, p) => acc + Math.pow(p - mean, 2), 0) / slice.length;
        const stdDev = Math.sqrt(variance);
        return {
            lowerBand: mean - 2 * stdDev,
            upperBand: mean + 2 * stdDev
        };
    }

    /**
     * Next sell price for infinite grid:
     * - If using percentage‐step: price * (1 + stepPct)
     * - Otherwise (fixed fallback), use base logic.
     */
    getNextSellPrice(filledPrice) {
        if (this.gridStepPercentage != null) {
            return filledPrice * (1 + this.gridStepPercentage);
        }
        // fallback to fixed‐spacing logic
        return super.getNextSellPrice(filledPrice);
    }

    /**
     * Next buy price for infinite grid:
     * - If using percentage‐step: price * (1 - stepPct), floored at lowerPrice if defined
     * - Otherwise (fixed fallback), use base logic.
     */
    getNextBuyPrice(filledPrice) {
        if (this.gridStepPercentage != null) {
            const nextPrice = filledPrice * (1 - this.gridStepPercentage);
            return this.lowerPrice != null ? Math.max(nextPrice, this.lowerPrice) : nextPrice;
        }
        return super.getNextBuyPrice(filledPrice);
    }

    /**
     * After each fill, call base behavior, then:
     * - If futures position closed (size=0), reevaluate grid
     * - Log debug events for infinite grid adjustments
     */
    async onOrderFilled(filledOrder) {
        // Always run normal trade‐recording & next‐leg logic
        await super.onOrderFilled(filledOrder);

        // If futures mode, when position size hits zero, rebuild grid
        if (this.isFutures) {
            const pos = await this.exchange.getPosition(this.symbol);
            if (pos && pos.size === 0) {
                logger.info({ event: 'POSITION_CLOSED', botId: this.id, message: 'Reevaluating grid in Infinity Grid Bot' });
                await this.reevaluateGrid();
            }
        }

        // Debug signals for infinite grid adjustments
        if (filledOrder.side === 'sell') {
            logger.debug({ event: 'INFINITY_SELL_FILLED', botId: this.id, newBaseValue: 'adjusted' });
        }
        if (filledOrder.side === 'buy') {
            logger.debug({ event: 'INFINITY_BUY_FILLED', botId: this.id, newBaseAmount: 'increased' });
        }
    }
}

module.exports = InfinityGridBot;
