/*
 * infinityGridBot.js
 *
 * Extends GridBot for an infinite grid strategy that adapts continuously.
 *
 * Methods:
 *   - initGrid(): Initializes grid boundaries using Bollinger Bands (if enabled) or percentage-based stepping.
 *     IO: No input; sets lowerPrice/upperPrice dynamically.
 *   - computeBollingerBands(): Computes dynamic bounds using recent price data.
 *     IO: No input; returns an object { lowerBand, upperBand }.
 *   - getNextSellPrice(filledPrice): Calculates next sell price.
 *     IO: Input: filledPrice (Number); Output: next sell price (Number).
 *   - getNextBuyPrice(filledPrice): Calculates next buy price.
 *     IO: Input: filledPrice (Number); Output: next buy price (Number).
 *   - onOrderFilled(filledOrder): Processes filled orders and may trigger grid reevaluation.
 *     IO: Input: filledOrder object; Output: processes the order.
 */

const GridBot = require('./gridBot');
const logger = require('../../../logs/gridLogger');

class InfinityGridBot extends GridBot {
    constructor(config, exchange) {
        super(config, exchange);
        // Set default percentage stepping.
        this.gridStepPercentage = config.gridStepPercentage || 0.01;
        // Optionally use Bollinger Bands for dynamic boundaries.
        this.useBollinger = config.useBollinger || false;
    }

    initGrid() {
        // IO: No input; sets grid boundaries.
        if (this.useBollinger) {
            // Compute Bollinger Bands for dynamic lower and upper bounds.
            const { lowerBand, upperBand } = this.computeBollingerBands();
            this.lowerPrice = lowerBand;
            this.upperPrice = upperBand;
            logger.info({ event: 'INIT_INFINITY_GRID_BB', symbol: this.symbol, lowerBand, upperBand });
        } else if (this.gridStepPercentage) {
            this.gridSpacing = null; // In percentage mode, gridSpacing is not used.
            logger.info({ event: 'INIT_INFINITY_GRID', symbol: this.symbol, stepPct: this.gridStepPercentage });
        } else {
            super.initGrid();
        }
    }

    /**
     * Computes Bollinger Bands as temporary dynamic bounds.
     * IO: No input; Output: Object with properties lowerBand and upperBand.
     */
    computeBollingerBands() {
        const prices = [/* array of recent close prices */];
        if (prices.length === 0) return { lowerBand: this.lowerPrice, upperBand: this.upperPrice };
        const period = 20;
        const slice = prices.slice(-period);
        const sum = slice.reduce((acc, p) => acc + p, 0);
        const mean = sum / slice.length;
        const variance = slice.reduce((acc, p) => acc + Math.pow(p - mean, 2), 0) / slice.length;
        const stdDev = Math.sqrt(variance);
        return { lowerBand: mean - 2 * stdDev, upperBand: mean + 2 * stdDev };
    }

    getNextSellPrice(filledPrice) {
        // IO: Input: filledPrice (Number); Output: next sell price (Number).
        const stepPct = this.gridStepPercentage || (this.gridSpacing / filledPrice);
        return filledPrice * (1 + stepPct);
    }

    getNextBuyPrice(filledPrice) {
        // IO: Input: filledPrice (Number); Output: next buy price (Number).
        const stepPct = this.gridStepPercentage || (this.gridSpacing / filledPrice);
        const nextPrice = filledPrice * (1 - stepPct);
        return this.lowerPrice ? Math.max(nextPrice, this.lowerPrice) : nextPrice;
    }

    async onOrderFilled(filledOrder) {
        // IO: Input: filledOrder object; Output: Processes the order and, if needed, reevaluates the grid.
        await super.onOrderFilled(filledOrder);
        // For futures trading, check if the position has closed.
        if (this.isFutures) {
            const pos = await this.exchange.getPosition(this.symbol);
            if (pos && pos.size === 0) {
                logger.info({ event: 'POSITION_CLOSED', message: 'Reevaluating grid in Infinity Grid Bot' });
                await this.reevaluateGrid();
            }
        }
        if (filledOrder.side === 'sell') {
            logger.debug({ event: 'INFINITY_SELL_FILLED', newBaseValue: 'adjusted' });
        }
        if (filledOrder.side === 'buy') {
            logger.debug({ event: 'INFINITY_BUY_FILLED', newBaseAmount: 'increased' });
        }
    }
}

module.exports = InfinityGridBot;
