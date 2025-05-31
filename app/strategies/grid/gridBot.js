// app/strategies/grid/gridBot.js

/*
 * gridBot.js
 *
 * Base class for grid trading bots.
 * Contains all shared logic for fixed‐spacing and percentage‐spacing grids.
 */

const logger = require('../../../logs/gridLogger');
const Trade  = require('../../models/Trade');

class GridBot {
    /**
     * @param {Object} config         – should include at least:
     *   { _id, symbol, gridConfig: { lowerPrice, upperPrice, gridCount, gridType, gridStepPercentage, takeProfitPct, stopLossPct, volatilityBasedSL, trailingStop, ATRMultiplier }, direction?, isFutures? }
     * @param {Object} exchangeClient – an object with .getCurrentPrice(), .placeOrder(), .cancelOrder(), .getPosition() methods
     */
    constructor(config, exchangeClient) {
        if (!config._id) {
            throw new Error('GridBot: config._id is required (the MongoDB ObjectId of the bot)');
        }
        this.id = config._id.toString();     // store the ObjectId as string
        this.symbol = config.symbol;
        this.isFutures = config.isFutures || false;
        this.direction = config.direction || (this.isFutures ? 'long' : 'long');

        // Unpack gridConfig (we assume config.gridConfig exists)
        const gc = config.gridConfig || {};
        this.lowerPrice = gc.lowerPrice;
        this.upperPrice = gc.upperPrice;
        this.gridCount = gc.gridCount;
        this.gridType = gc.gridType || 'fixed';
        this.gridStepPercentage = gc.gridStepPercentage || 0.01;
        this.gridSpacing = null;

        // If you want to size by a fixed “investment per slot,” you could pass it in config.
        // For now, we’ll derive quantity from a notional of 1 unit per grid-level (simple example).
        this.notionalPerSlot = config.notionalPerSlot || 1;

        // Profit / stop parameters
        this.takeProfitPct = gc.takeProfitPct != null ? gc.takeProfitPct : 2;
        this.stopLossPct = gc.stopLossPct != null ? gc.stopLossPct : 2;
        this.volatilityBasedTP = gc.volatilityBasedTP || false;
        this.volatilityBasedSL = gc.volatilityBasedSL != null ? gc.volatilityBasedSL : true;
        this.trailingStop = gc.trailingStop != null ? gc.trailingStop : true;
        this.ATRMultiplier = gc.ATRMultiplier != null ? gc.ATRMultiplier : 3;

        // Internal state
        this.orders = [];                // list of open orders (each with { id, side, price, quantity } returned by exchange)
        this.exchange = exchangeClient;
        this.running = false;

        this.lastHighPrice = null;
        this.lastLowPrice = null;

        // If a subclass wants an AI model, it can override this
        this.aiModel = config.aiModel || null;

        // Promise‐locks to serialize onOrderFilled for each strategy instance
        this.retryCount = 0;
    }

    /**
     * Calculate gridSpacing or percentage‐based spacing.
     */
    initGrid() {
        const { lowerPrice, upperPrice, gridCount, symbol } = this;
        if (this.gridType === 'fixed') {
            if (upperPrice != null && lowerPrice != null && gridCount > 0) {
                this.gridSpacing = (upperPrice - lowerPrice) / gridCount;
            } else {
                throw new Error(`GridBot.initGrid: invalid fixed‐grid parameters for bot ${this.id}`);
            }
        }
        else if (this.gridType === 'percentage') {
            if (lowerPrice != null && this.gridStepPercentage != null) {
                this.gridSpacing = this.lowerPrice * this.gridStepPercentage;
            } else {
                throw new Error(`GridBot.initGrid: invalid percentage‐grid parameters for bot ${this.id}`);
            }
        }
        // If gridType is “infinite,” spacing logic will be overridden by subclass
        logger.info({
            event: 'INIT_GRID',
            botId: this.id,
            symbol,
            lowerPrice,
            upperPrice,
            gridCount,
            gridSpacing: this.gridSpacing
        });
    }

    /**
     * Start the grid: initialize spacing, place initial ladder of buy (or sell) orders,
     * then begin the 1‐second monitor loop.
     */
    async start() {
        this.running = true;
        this.initGrid();

        // Fetch the current price to know where to start placing orders
        const currentPrice = await this.exchange.getCurrentPrice(this.symbol);
        if (currentPrice == null) {
            throw new Error(`GridBot.start: could not fetch current price for ${this.symbol}`);
        }

        // Depending on futures vs. spot, and long vs. short, place initial grid
        if (!this.isFutures) {
            if (this.direction === 'long') {
                await this.placeInitialBuys(currentPrice);
            }
            // (If you support a spot “short” grid, you’d place initial sells. In most cases, spot-long only.)
        }
        else {
            if (this.direction === 'long') {
                await this.placeInitialBuys(currentPrice);
            } else {
                await this.placeInitialSells(currentPrice);
            }
        }

        // Begin periodic monitoring for trailing stops / risk checks
        this.monitorInterval = setInterval(() => this.monitor(), 1000);
        logger.info({
            event: 'BOT_STARTED',
            botId: this.id,
            symbol: this.symbol,
            mode: this.direction
        });
    }

    /**
     * Stop the grid: cancel all existing orders and clear the monitor loop.
     */
    async stop() {
        this.running = false;
        clearInterval(this.monitorInterval);

        for (let order of this.orders) {
            try {
                await this.exchange.cancelOrder(this.symbol, order.id);
            } catch (err) {
                logger.error({ event: 'CANCEL_ORDER_ERROR', botId: this.id, error: err.message });
            }
        }
        this.orders = [];
        logger.info({ event: 'BOT_STOPPED', botId: this.id });
    }

    /**
     * Periodically called (once per second) to handle trailing stops or futures risk checks.
     */
    async monitor() {
        const price = await this.exchange.getCurrentPrice(this.symbol);
        if (price == null) return;

        if (this.trailingStop) {
            this.updateTrailingStops(price);
        }

        if (this.isFutures) {
            const pos = await this.exchange.getPosition(this.symbol);
            if (pos && pos.marginRatio !== undefined && pos.marginRatio > 0.8) {
                logger.warn({
                    event: 'RISK_ALERT',
                    botId: this.id,
                    marginRatio: pos.marginRatio,
                    action: 'closing_positions'
                });
                await this.closePositions();
            }
        }
    }

    /**
     * Update lastHigh/lastLow and apply volatility‐based or percentage‐based stops.
     */
    updateTrailingStops(currentPrice) {
        if (this.direction === 'long') {
            if (this.lastHighPrice === null || currentPrice > this.lastHighPrice) {
                this.lastHighPrice = currentPrice;
            }
            if (this.volatilityBasedSL) {
                const atr = this.getATR();
                const stopPrice = this.lastHighPrice - this.ATRMultiplier * atr;
                if (currentPrice <= stopPrice) {
                    logger.info({ event: 'TRAILING_STOP_HIT', botId: this.id, price: currentPrice, stopPrice });
                    this.closePositions();
                }
            } else if (this.takeProfitPct) {
                const dropPct = ((this.lastHighPrice - currentPrice) / this.lastHighPrice) * 100;
                if (dropPct >= this.takeProfitPct) {
                    logger.info({ event: 'TRAILING_STOP_HIT', botId: this.id, price: currentPrice, dropPct });
                    this.closePositions();
                }
            }
        }
        else { // direction === 'short'
            if (this.lastLowPrice === null || currentPrice < this.lastLowPrice) {
                this.lastLowPrice = currentPrice;
            }
            if (this.volatilityBasedSL) {
                const atr = this.getATR();
                const stopPrice = this.lastLowPrice + this.ATRMultiplier * atr;
                if (currentPrice >= stopPrice) {
                    logger.info({ event: 'TRAILING_STOP_HIT', botId: this.id, price: currentPrice, stopPrice });
                    this.closePositions();
                }
            } else if (this.takeProfitPct) {
                const risePct = ((currentPrice - this.lastLowPrice) / this.lastLowPrice) * 100;
                if (risePct >= this.takeProfitPct) {
                    logger.info({ event: 'TRAILING_STOP_HIT', botId: this.id, price: currentPrice, risePct });
                    this.closePositions();
                }
            }
        }
    }

    /**
     * Place the initial ladder of buy‐limit orders down to lowerPrice (for a long grid).
     */
    async placeInitialBuys(currentPrice) {
        if (this.lowerPrice == null || this.gridCount == null) return;

        // Calculate spacing:
        //   fixed → use this.gridSpacing;
        //   percentage → use currentPrice * gridStepPercentage
        const step = (this.gridType === 'fixed')
            ? this.gridSpacing
            : (currentPrice * this.gridStepPercentage);

        // Example: if currentPrice=50, lowerPrice=40, step=1, this.gridCount=10,
        // we place orders at 49, 48, 47, … down to 40 (inclusive).
        for (let price = currentPrice - step; price >= this.lowerPrice; price -= step) {
            const quantity = this.calculateOrderQuantity(price);
            try {
                const order = await this.exchange.placeOrder(
                    this.symbol, 'buy', quantity, price, { reduceOnly: false }
                );
                if (order) {
                    this.orders.push(order);
                    logger.info({
                        event: 'PLACE_BUY_ORDER',
                        botId: this.id,
                        price,
                        quantity,
                        orderId: order.id
                    });
                }
            } catch (err) {
                logger.error({
                    event: 'PLACE_BUY_ERROR',
                    botId: this.id,
                    price,
                    quantity,
                    error: err.message
                });
            }
        }
    }

    /**
     * Place the initial ladder of sell‐limit orders up to upperPrice (for a short grid or
     * take‐profit sells in futures long).
     */
    async placeInitialSells(currentPrice) {
        if (this.upperPrice == null || this.gridCount == null) return;

        const step = (this.gridType === 'fixed')
            ? this.gridSpacing
            : (currentPrice * this.gridStepPercentage);

        for (let price = currentPrice + step; price <= this.upperPrice; price += step) {
            const quantity = this.calculateOrderQuantity(price);
            try {
                const order = await this.exchange.placeOrder(
                    this.symbol, 'sell', quantity, price, { reduceOnly: false }
                );
                if (order) {
                    this.orders.push(order);
                    logger.info({
                        event: 'PLACE_SELL_ORDER',
                        botId: this.id,
                        price,
                        quantity,
                        orderId: order.id
                    });
                }
            } catch (err) {
                logger.error({
                    event: 'PLACE_SELL_ERROR',
                    botId: this.id,
                    price,
                    quantity,
                    error: err.message
                });
            }
        }
    }

    /**
     * Calculate how many units to buy/sell at the given price.
     * For a simple example, we equally split “notionalPerSlot” among gridCount and then
     * divide by price to get quantity.
     */
    calculateOrderQuantity(price) {
        // e.g. if notionalPerSlot = 1 USD, gridCount=10, we invest 0.1 USD per order:
        const perSlotNotional = this.notionalPerSlot / this.gridCount;
        return perSlotNotional / price;
    }

    /**
     * Called whenever an order is filled. We remove it from this.orders, record a Trade in Mongo,
     * then place the opposite leg (sell if we just bought; buy if we just sold).
     */
    async onOrderFilled(filledOrder) {
        // 1) Remove from open orders
        this.orders = this.orders.filter(o => o.id !== filledOrder.id);

        logger.info({
            event: 'ORDER_FILLED',
            botId: this.id,
            orderId: filledOrder.id,
            side: filledOrder.side,
            price: filledOrder.price,
            qty: filledOrder.quantity
        });

        // 2) Record the trade in MongoDB
        //    We assume the Trade model has fields: { bot: ObjectId, symbol, side, price, quantity, profit? }
        let profit = null;
        if (filledOrder.side === 'sell') {
            profit = filledOrder.quantity * filledOrder.price - filledOrder.cost;
        }

        try {
            await Trade.create({
                bot:      this.id,
                symbol:   this.symbol,
                side:     filledOrder.side,
                price:    filledOrder.price,
                quantity: filledOrder.quantity,
                profit:   profit
            });
        } catch (err) {
            logger.error({ event: 'TRADE_CREATE_ERROR', botId: this.id, error: err.message });
        }

        // 3) Place the “next leg”:
        const price = filledOrder.price;
        if (!this.isFutures) {
            // Spot grid logic: if we just bought, place a sell at price+step; if we just sold, place a buy at price-step.
            if (filledOrder.side === 'buy') {
                const sellPrice = this.getNextSellPrice(price);
                const sellQty   = filledOrder.quantity;
                try {
                    const order = await this.exchange.placeOrder(
                        this.symbol, 'sell', sellQty, sellPrice, {}
                    );
                    if (order) {
                        this.orders.push(order);
                        logger.info({
                            event: 'PLACE_SELL_ORDER',
                            botId: this.id,
                            price: sellPrice,
                            quantity: sellQty,
                            linkToBuy: filledOrder.id
                        });
                    }
                } catch (err) {
                    logger.error({
                        event: 'PLACE_SELL_ERROR',
                        botId: this.id,
                        price: sellPrice,
                        quantity: sellQty,
                        error: err.message
                    });
                }
            } else { // filledOrder.side === 'sell'
                const buyPrice = this.getNextBuyPrice(price);
                const buyQty   = this.calculateOrderQuantity(buyPrice);
                try {
                    const order = await this.exchange.placeOrder(
                        this.symbol, 'buy', buyQty, buyPrice, {}
                    );
                    if (order) {
                        this.orders.push(order);
                        logger.info({
                            event: 'PLACE_BUY_ORDER',
                            botId: this.id,
                            price: buyPrice,
                            quantity: buyQty,
                            linkToSell: filledOrder.id
                        });
                    }
                } catch (err) {
                    logger.error({
                        event: 'PLACE_BUY_ERROR',
                        botId: this.id,
                        price: buyPrice,
                        quantity: buyQty,
                        error: err.message
                    });
                }
            }
        }
        else {
            // Futures logic: use reduceOnly flags on opposite‐side orders
            if (this.direction === 'long') {
                if (filledOrder.side === 'buy') {
                    const sellPrice = this.getNextSellPrice(price);
                    try {
                        const order = await this.exchange.placeOrder(
                            this.symbol, 'sell', filledOrder.quantity, sellPrice, { reduceOnly: true }
                        );
                        this.orders.push(order);
                        logger.info({
                            event: 'PLACE_TP_SELL',
                            botId: this.id,
                            price: sellPrice,
                            qty: filledOrder.quantity
                        });
                    } catch (err) {
                        logger.error({
                            event: 'PLACE_TP_SELL_ERROR',
                            botId: this.id,
                            price: sellPrice,
                            qty: filledOrder.quantity,
                            error: err.message
                        });
                    }
                } else {
                    // We just sold. Place a buy at price-step (reduceOnly=false).
                    const buyPrice = this.getNextBuyPrice(price);
                    const buyQty   = this.calculateOrderQuantity(buyPrice);
                    try {
                        const order = await this.exchange.placeOrder(
                            this.symbol, 'buy', buyQty, buyPrice, { reduceOnly: false }
                        );
                        this.orders.push(order);
                        logger.info({
                            event: 'PLACE_BUY_ORDER',
                            botId: this.id,
                            price: buyPrice,
                            qty: buyQty
                        });
                    } catch (err) {
                        logger.error({
                            event: 'PLACE_BUY_ERROR',
                            botId: this.id,
                            price: buyPrice,
                            qty: buyQty,
                            error: err.message
                        });
                    }
                }
            } else {
                // direction === 'short'
                if (filledOrder.side === 'sell') {
                    const buyPrice = this.getNextBuyPrice(price);
                    try {
                        const order = await this.exchange.placeOrder(
                            this.symbol, 'buy', filledOrder.quantity, buyPrice, { reduceOnly: true }
                        );
                        this.orders.push(order);
                        logger.info({
                            event: 'PLACE_TP_BUY',
                            botId: this.id,
                            price: buyPrice,
                            qty: filledOrder.quantity
                        });
                    } catch (err) {
                        logger.error({
                            event: 'PLACE_TP_BUY_ERROR',
                            botId: this.id,
                            price: buyPrice,
                            qty: filledOrder.quantity,
                            error: err.message
                        });
                    }
                } else {
                    // We just bought; place a sell
                    const sellPrice = this.getNextSellPrice(price);
                    const sellQty   = this.calculateOrderQuantity(sellPrice);
                    try {
                        const order = await this.exchange.placeOrder(
                            this.symbol, 'sell', sellQty, sellPrice, { reduceOnly: false }
                        );
                        this.orders.push(order);
                        logger.info({
                            event: 'PLACE_SELL_ORDER',
                            botId: this.id,
                            price: sellPrice,
                            qty: sellQty
                        });
                    } catch (err) {
                        logger.error({
                            event: 'PLACE_SELL_ERROR',
                            botId: this.id,
                            price: sellPrice,
                            qty: sellQty,
                            error: err.message
                        });
                    }
                }
            }
        }
    }

    /**
     * Next sell price after a fill: either fixed‐spacing or percentage spacing
     */
    getNextSellPrice(filledPrice) {
        const step = (this.gridType === 'fixed')
            ? (this.gridSpacing || (filledPrice * this.gridStepPercentage))
            : (filledPrice * this.gridStepPercentage);
        return filledPrice + step;
    }

    /**
     * Next buy price after a fill. We ensure it does not go below lowerPrice.
     */
    getNextBuyPrice(filledPrice) {
        const step = (this.gridType === 'fixed')
            ? (this.gridSpacing || (filledPrice * this.gridStepPercentage))
            : (filledPrice * this.gridStepPercentage);
        return Math.max(filledPrice - step, this.lowerPrice || 0);
    }

    /**
     * Cancel all existing orders, recalculate spacing, and re‐place the full grid
     */
    async reevaluateGrid() {
        for (let order of this.orders) {
            try {
                await this.exchange.cancelOrder(this.symbol, order.id);
            } catch (err) {
                logger.error({ event: 'CANCEL_ORDER_ERROR', botId: this.id, error: err.message });
            }
        }
        this.orders = [];
        const currentPrice = await this.exchange.getCurrentPrice(this.symbol);

        if (!this.isFutures) {
            if (this.direction === 'long') {
                await this.placeInitialBuys(currentPrice);
            }
        } else {
            if (this.direction === 'long') {
                await this.placeInitialBuys(currentPrice);
            } else {
                await this.placeInitialSells(currentPrice);
            }
        }
        logger.info({ event: 'GRID_REEVALUATED', botId: this.id, currentPrice });
    }

    /**
     * Close all positions (futures) or just stop the grid (spot).
     */
    async closePositions() {
        if (this.isFutures) {
            const pos = await this.exchange.getPosition(this.symbol);
            if (pos && pos.size !== 0) {
                const side = pos.size > 0 ? 'sell' : 'buy';
                try {
                    await this.exchange.placeOrder(
                        this.symbol, side, Math.abs(pos.size), null, { reduceOnly: true }
                    );
                    logger.info({
                        event: 'CLOSE_POSITION',
                        botId: this.id,
                        symbol: this.symbol,
                        side,
                        size: pos.size
                    });
                } catch (err) {
                    logger.error({
                        event: 'CLOSE_POSITION_ERROR',
                        botId: this.id,
                        error: err.message
                    });
                }
            }
        }
        // In either case, stop placing new orders
        await this.stop();
    }

    /**
     * Stub: override in subclasses if you actually compute ATR. Base returns 0.
     */
    getATR() {
        return this._atr || 0;
    }
}

module.exports = GridBot;
