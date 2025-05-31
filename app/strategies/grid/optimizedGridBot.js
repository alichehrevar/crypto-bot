/*
 * optimizedGridBot.js
 *
 * Extends GridBot by integrating an AI model to dynamically optimize grid parameters.
 *
 * Methods:
 *   - start(): Starts the bot, runs initial optimization, and schedules periodic re-optimization and market monitoring.
 *     IO: No input; returns a Promise that resolves when the bot has started.
 *   - optimizeParameters(): Gathers market data and updates grid settings via AI prediction.
 *     IO: No input; returns a Promise that resolves after updating parameters.
 *   - estimateHurst(), estimateADX(), estimateVolatility(), estimateTrend():
 *     IO: No input; each returns a Promise that resolves with a dummy market feature value.
 *   - checkAndApplyMarketCondition(): Monitors market condition to pause/resume trading.
 *     IO: No input; returns a Promise.
 *   - onOrderFilled(order): Processes order fills if not paused.
 *     IO: Input: an order object; returns a Promise.
 *   - stop(): Stops the bot and clears timers.
 *     IO: No input; returns a Promise.
 */

const GridBot = require('./gridBot');
const logger = require('../../../logs/gridLogger');

class OptimizedGridBot extends GridBot {
    constructor(config, exchange) {
        super(config, exchange);
        this.aiModel = config.aiModel || null;
        this.retrainInterval = config.retrainInterval || 3600e3; // Default: every hour
        this.paused = false;  // Flag to pause grid trading in trending markets
    }

    async start() {
        // IO: No input; starts the bot and its optimization/monitoring timers.
        if (this.aiModel) {
            await this.optimizeParameters();
        }
        super.start();
        if (this.aiModel) {
            this.optimizeTimer = setInterval(() => {
                this.optimizeParameters().catch(err => logger.error("Optimize error", err));
            }, this.retrainInterval);
        }
        // Start market condition monitoring (every second)
        this.conditionMonitor = setInterval(() => this.checkAndApplyMarketCondition(), 1000);
    }

    async optimizeParameters() {
        // IO: No input; output is the internal update of grid parameters.
        // Gather current market state features for the AI model.
        const price = await this.exchange.getCurrentPrice(this.symbol);
        const volatility = await this.estimateVolatility();
        const trend = await this.estimateTrend();
        const hurst = await this.estimateHurst();
        const adx = await this.estimateADX();
        const openPositions = this.orders.length;
        const features = { price, volatility, trend, openOrders: openPositions, hurst, adx };
        logger.info({ event: 'OPTIMIZE_START', features });
        if (this.aiModel) {
            const suggestion = await this.aiModel.predict(features);
            if (suggestion) {
                // Update parameters if the AI model provides new suggestions.
                if (suggestion.gridCount && suggestion.gridCount !== this.gridCount) {
                    this.gridCount = suggestion.gridCount;
                }
                if (suggestion.gridStepPercentage) {
                    this.gridStepPercentage = suggestion.gridStepPercentage;
                } else if (suggestion.gridSpacing) {
                    this.gridSpacing = suggestion.gridSpacing;
                }
                if (suggestion.takeProfitPct) {
                    this.takeProfitPct = suggestion.takeProfitPct;
                }
                if (suggestion.stopLossPct) {
                    this.stopLossPct = suggestion.stopLossPct;
                }
                if (suggestion.volatilityBasedSL !== undefined) {
                    this.volatilityBasedSL = suggestion.volatilityBasedSL;
                }
                logger.info({ event: 'OPTIMIZE_APPLIED', newParams: suggestion });
            }
        }
    }

    async estimateHurst() {
        // IO: No input; returns a dummy Hurst exponent (Number).
        return 0.45; // Placeholder: assume market is ranging.
    }

    async estimateADX() {
        // IO: No input; returns a dummy ADX value (Number).
        return 18; // Placeholder: assume low trend strength.
    }

    async estimateVolatility() {
        // IO: No input; returns a promise resolving to current volatility (using getATR).
        return this.getATR() || 0;
    }

    async estimateTrend() {
        // IO: No input; returns a dummy trend value (Number).
        return 0;
    }

    async checkAndApplyMarketCondition() {
        // IO: No input; outputs internal state change (pausing/resuming trading).
        const hurst = await this.estimateHurst();
        const adx = await this.estimateADX();
        logger.info({ event: 'MARKET_CONDITION', hurst, adx });
        // If market is trending, pause the grid; if not, resume.
        if (hurst > 0.5 || adx > 25) {
            if (!this.paused) {
                this.paused = true;
                logger.warn({ event: 'GRID_PAUSED', reason: 'Trending market detected', hurst, adx });
            }
        } else {
            if (this.paused) {
                this.paused = false;
                logger.info({ event: 'GRID_RESUMED', reason: 'Market returned to ranging conditions', hurst, adx });
                this.initGrid();
            }
        }
    }

    async onOrderFilled(order) {
        // IO: Input: order object from exchange; output: processes order fill only if bot is active.
        if (this.paused) {
            logger.info({ event: 'ORDER_FILLED_IGNORED_PAUSED', orderId: order.id });
            return;
        }
        await super.onOrderFilled(order);
        if (this.aiModel) {
            // Optionally, update the AI model with trade feedback.
        }
    }

    async stop() {
        // IO: No input; stops the bot and clears any scheduled timers.
        if (this.optimizeTimer) clearInterval(this.optimizeTimer);
        if (this.conditionMonitor) clearInterval(this.conditionMonitor);
        super.stop();
    }
}

module.exports = OptimizedGridBot;
