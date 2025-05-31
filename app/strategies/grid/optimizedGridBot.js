// app/strategies/grid/optimizedGridBot.js

/*
 * optimizedGridBot.js
 *
 * Extends GridBot by integrating an AI model to dynamically optimize grid parameters.
 */

const GridBot = require('./gridBot');
const logger  = require('../../../logs/gridLogger');

class OptimizedGridBot extends GridBot {
    constructor(config, exchange) {
        super(config, exchange);

        // AI‐driven optimizer
        this.aiModel = config.aiModel || null;

        // How often (ms) to re‐run the optimizer
        this.retrainInterval = config.retrainInterval || 3600e3; // default: 1 hour

        // Whether we temporarily pause order processing
        this.paused = false;
    }

    /**
     * 1) If we have an AI model, run optimizeParameters before placing the initial grid
     * 2) Call super.start() to place the grid and begin monitoring
     * 3) Every retrainInterval ms, re‐run optimizeParameters
     * 4) Start a conditionMonitor that pauses or resumes the grid if market “trending” is detected
     */
    async start() {
        if (this.aiModel) {
            try {
                await this.optimizeParameters();
            } catch (err) {
                logger.error({ event: 'OPTIMIZE_START_ERROR', botId: this.id, error: err.message });
            }
        }

        // Place initial grid
        await super.start();

        // Periodically re‐optimize
        if (this.aiModel) {
            this.optimizeTimer = setInterval(() => {
                this.optimizeParameters().catch(err => {
                    logger.error({ event: 'OPTIMIZE_INTERVAL_ERROR', botId: this.id, error: err.message });
                });
            }, this.retrainInterval);
        }

        // Monitor for trending/ranging conditions
        this.conditionMonitor = setInterval(() => this.checkAndApplyMarketCondition(), 1000);
    }

    /**
     * Use AI model to predict new grid parameters (gridCount, spacing, TP/SL, etc.).
     * If the AI suggests something different, apply it and then reinitialize the grid:
     *  - call initGrid() to recalc spacing
     *  - call reevaluateGrid() to cancel & re‐place orders
     */
    async optimizeParameters() {
        const price = await this.exchange.getCurrentPrice(this.symbol);
        if (price == null) {
            logger.warn({ event: 'OPTIMIZE_NO_PRICE', botId: this.id });
            return;
        }

        const volatility = await this.estimateVolatility();
        const trend      = await this.estimateTrend();
        const hurst      = await this.estimateHurst();
        const adx        = await this.estimateADX();
        const openOrders = this.orders.length;

        const features = {
            price,
            volatility,
            trend,
            openOrders,
            hurst,
            adx
        };

        logger.info({ event: 'OPTIMIZE_START', botId: this.id, features });

        if (!this.aiModel || typeof this.aiModel.predict !== 'function') {
            logger.warn({ event: 'OPTIMIZE_NO_MODEL', botId: this.id });
            return;
        }

        let suggestion;
        try {
            suggestion = await this.aiModel.predict(features);
        } catch (err) {
            logger.error({ event: 'AI_PREDICT_ERROR', botId: this.id, error: err.message });
            return;
        }

        if (!suggestion) {
            logger.info({ event: 'OPTIMIZE_NO_SUGGESTION', botId: this.id });
            return;
        }

        let changed = false;

        // Apply any suggested gridCount
        if (suggestion.gridCount && suggestion.gridCount !== this.gridCount) {
            this.gridCount = suggestion.gridCount;
            changed = true;
        }

        // Apply either a new percentage step or fixed spacing
        if (suggestion.gridStepPercentage != null && suggestion.gridStepPercentage !== this.gridStepPercentage) {
            this.gridStepPercentage = suggestion.gridStepPercentage;
            changed = true;
        }
        else if (suggestion.gridSpacing != null && suggestion.gridSpacing !== this.gridSpacing) {
            this.gridSpacing = suggestion.gridSpacing;
            changed = true;
        }

        // TP/SL updates
        if (suggestion.takeProfitPct != null && suggestion.takeProfitPct !== this.takeProfitPct) {
            this.takeProfitPct = suggestion.takeProfitPct;
            changed = true;
        }
        if (suggestion.stopLossPct != null && suggestion.stopLossPct !== this.stopLossPct) {
            this.stopLossPct = suggestion.stopLossPct;
            changed = true;
        }
        if (suggestion.volatilityBasedSL != null && suggestion.volatilityBasedSL !== this.volatilityBasedSL) {
            this.volatilityBasedSL = suggestion.volatilityBasedSL;
            changed = true;
        }

        if (changed) {
            logger.info({ event: 'OPTIMIZE_APPLIED', botId: this.id, newParams: suggestion });

            // Re‐initialize spacing based on new gridCount or step
            this.initGrid();

            // Cancel existing orders and re‐place grid with updated spacing
            await this.reevaluateGrid();
        } else {
            logger.info({ event: 'OPTIMIZE_NO_CHANGE', botId: this.id });
        }
    }

    async estimateHurst() {
        // Placeholder: plug in Hurst calculation
        return 0.45;
    }

    async estimateADX() {
        // Placeholder: plug in ADX calculation
        return 18;
    }

    async estimateVolatility() {
        // Use ATR from base class (could return 0 if not implemented)
        return this.getATR() || 0;
    }

    async estimateTrend() {
        // Placeholder: simple trend indicator (e.g. SMA slope)
        return 0;
    }

    /**
     * Check if market is trending/falling; if so, pause grid activity. Otherwise, resume.
     */
    async checkAndApplyMarketCondition() {
        const hurst = await this.estimateHurst();
        const adx   = await this.estimateADX();

        logger.info({ event: 'MARKET_CONDITION', botId: this.id, hurst, adx });

        // If trend‐detect indicates trending (> 0.5 Hurst or > 25 ADX), pause new fills
        if ((hurst > 0.5 || adx > 25) && !this.paused) {
            this.paused = true;
            logger.warn({ event: 'GRID_PAUSED', botId: this.id, reason: 'Trending market detected', hurst, adx });
        }
        // If market returns to ranging, resume grid
        else if ((hurst <= 0.5 && adx <= 25) && this.paused) {
            this.paused = false;
            logger.info({ event: 'GRID_RESUMED', botId: this.id, reason: 'Market returned to ranging conditions', hurst, adx });
            // Re‐initialize grid spacing and orders
            this.initGrid();
            await this.reevaluateGrid();
        }
    }

    /**
     * Override onOrderFilled to ignore signals while paused;
     * otherwise, call base implementation (which logs and places next leg).
     */
    async onOrderFilled(order) {
        if (this.paused) {
            logger.info({ event: 'ORDER_FILLED_IGNORED_PAUSED', botId: this.id, orderId: order.id });
            return;
        }
        await super.onOrderFilled(order);

        // Optionally, feed back to AI model with trade results
        if (this.aiModel && typeof this.aiModel.update === 'function') {
            try {
                await this.aiModel.update({
                    price: order.price,
                    side: order.side,
                    quantity: order.quantity,
                    profit: (order.side === 'sell') ? (order.quantity * order.price - order.cost) : null
                });
            } catch (err) {
                logger.error({ event: 'AI_UPDATE_ERROR', botId: this.id, error: err.message });
            }
        }
    }

    /**
     * Clear any optimization timers and condition monitors when stopping.
     */
    async stop() {
        if (this.optimizeTimer) clearInterval(this.optimizeTimer);
        if (this.conditionMonitor) clearInterval(this.conditionMonitor);
        await super.stop();
    }
}

module.exports = OptimizedGridBot;
