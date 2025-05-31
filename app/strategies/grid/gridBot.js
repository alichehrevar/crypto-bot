/*
 * gridBot.js
 *
 * Base class for grid trading bots.
 * Implements core functionalities:
 *  - Grid initialization.
 *  - Starting and stopping the bot.
 *  - Placing initial orders (buy/sell).
 *  - Processing order fills and placing subsequent orders.
 *  - Monitoring market conditions and risk management (trailing stops).
 *
 * IO for major functions:
 *   - constructor(config, exchangeClient):
 *       Input: configuration object with bot settings, exchange client instance.
 *       Output: A new GridBot instance.
 *   - initGrid():
 *       Input: None.
 *       Output: Calculates and sets gridSpacing based on grid type.
 *   - start():
 *       Input: None.
 *       Output: Starts the bot by placing initial orders and beginning the monitoring loop.
 *   - stop():
 *       Input: None.
 *       Output: Stops the bot, cancels open orders, and clears the monitoring loop.
 *   - monitor():
 *       Input: None.
 *       Output: Periodically checks market price and risk conditions.
 *   - updateTrailingStops(currentPrice):
 *       Input: currentPrice (Number).
 *       Output: Updates trailing stops and may trigger position closure.
 *   - placeInitialBuys(currentPrice) / placeInitialSells(currentPrice):
 *       Input: currentPrice (Number).
 *       Output: Places initial buy or sell orders.
 *   - calculateOrderQuantity(price):
 *       Input: price (Number).
 *       Output: Returns the order quantity (Number) based on investment allocation.
 *   - onOrderFilled(filledOrder):
 *       Input: filledOrder object.
 *       Output: Processes the order fill, logs trade details, and places the next order.
 *   - getNextSellPrice(filledPrice) / getNextBuyPrice(filledPrice):
 *       Input: filledPrice (Number).
 *       Output: Returns the price for the next sell or buy order.
 *   - reevaluateGrid():
 *       Input: None.
 *       Output: Cancels open orders, reinitializes grid, and places new orders.
 *   - closePositions():
 *       Input: None.
 *       Output: Closes futures positions and stops the bot.
 *   - getATR():
 *       Input: None.
 *       Output: Returns a placeholder ATR value (Number).
 */

const logger = require('../../../logs/gridLogger');
const { Trade } = require('./db');

class GridBot {
    constructor(config, exchangeClient) {
        // IO:
        //   Input: config (Object) with settings, exchangeClient instance.
        //   Output: Initializes a new GridBot instance with a unique id.
        this.id = config.id || `bot-${Date.now()}`;
        this.symbol = config.symbol;
        this.isFutures = config.futures || false;
        // For spot trading, always 'long'; for futures, may be 'long' or 'short'.
        this.direction = config.direction || (this.isFutures ? 'long' : 'long');

        // Grid parameters (with defaults if not provided).
        this.lowerPrice = config.lowerPrice || 100;
        this.upperPrice = config.upperPrice || 200;
        this.gridCount = config.gridCount || 10;
        this.investmentAmount = config.investmentAmount || 1000;
        // Grid type: "fixed" or "percentage".
        this.gridType = config.gridType || 'fixed';
        this.gridStepPercentage = config.gridStepPercentage || 0.01;
        this.gridSpacing = null;  // To be calculated in initGrid().

        this.orders = [];         // Active grid orders.
        this.exchange = exchangeClient;
        this.running = false;

        // Risk management settings.
        this.takeProfitPct = config.takeProfitPct || 2;
        this.stopLossPct = config.stopLossPct || 2;
        this.volatilityBasedTP = config.volatilityBasedTP || false;
        this.volatilityBasedSL = config.volatilityBasedSL || true;
        this.trailingStop = config.trailingStop || true;
        this.ATRMultiplier = config.ATRMultiplier || 3;

        // Variables for trailing stop calculations.
        this.lastHighPrice = null;
        this.lastLowPrice = null;

        // For AI optimization, if applicable.
        this.aiModel = config.aiModel || null;

        // Simple retry counter for API calls.
        this.retryCount = 0;
    }

    initGrid() {
        // IO: No input; Output: calculates gridSpacing based on lowerPrice, upperPrice, and gridCount.
        const { lowerPrice, upperPrice, gridCount, symbol } = this;
        if (this.gridType === 'fixed') {
            if (this.upperPrice && this.lowerPrice) {
                this.gridSpacing = (upperPrice - lowerPrice) / gridCount;
            }
        } else if (this.gridType === 'percentage') {
            // For percentage mode, gridSpacing is based on the lowerPrice.
            this.gridSpacing = this.lowerPrice * this.gridStepPercentage;
        }
        logger.info({ event: 'INIT_GRID', symbol, lowerPrice, upperPrice, gridCount, gridSpacing: this.gridSpacing });
    }

    async start() {
        // IO: No input; Output: Starts the bot by initializing the grid, placing orders, and starting the monitoring loop.
        this.running = true;
        this.initGrid();
        const currentPrice = await this.exchange.getCurrentPrice(this.symbol);
        if (!this.isFutures) {
            if (this.direction === 'long') {
                await this.placeInitialBuys(currentPrice);
            }
        } else {
            if (this.direction === 'long') {
                await this.placeInitialBuys(currentPrice);
            } else if (this.direction === 'short') {
                await this.placeInitialSells(currentPrice);
            }
        }
        this.monitorInterval = setInterval(() => this.monitor(), 1000);
        logger.info({ event: 'BOT_STARTED', botId: this.id, symbol: this.symbol, mode: this.direction });
    }

    async stop() {
        // IO: No input; Output: Stops the bot, cancels all open orders, and clears the monitoring loop.
        this.running = false;
        clearInterval(this.monitorInterval);
        for (let order of this.orders) {
            await this.exchange.cancelOrder(this.symbol, order.id).catch(err => logger.error(err));
        }
        this.orders = [];
        logger.info({ event: 'BOT_STOPPED', botId: this.id });
    }

    async monitor() {
        // IO: No input; Output: Periodically monitors market price and risk conditions.
        const price = await this.exchange.getCurrentPrice(this.symbol);
        if (!price) return;
        if (this.trailingStop) {
            this.updateTrailingStops(price);
        }
        if (this.isFutures) {
            const pos = await this.exchange.getPosition(this.symbol);
            if (pos && pos.marginRatio !== undefined && pos.marginRatio > 0.8) {
                logger.warn({ event: 'RISK_ALERT', botId: this.id, marginRatio: pos.marginRatio, action: 'closing_positions' });
                await this.closePositions();
            }
        }
    }

    updateTrailingStops(currentPrice) {
        // IO: Input: currentPrice (Number); Output: Updates trailing stop levels and may trigger closing positions.
        if (this.direction === 'long') {
            if (this.lastHighPrice === null || currentPrice > this.lastHighPrice) {
                this.lastHighPrice = currentPrice;
            }
            if (this.volatilityBasedSL) {
                const atr = this.getATR();
                const stopPrice = this.lastHighPrice - this.ATRMultiplier * atr;
                if (currentPrice <= stopPrice) {
                    logger.info({ event: 'TRAILING_STOP_HIT', price: currentPrice, stopPrice });
                    this.closePositions();
                }
            } else if (this.takeProfitPct) {
                const dropPct = ((this.lastHighPrice - currentPrice) / this.lastHighPrice) * 100;
                if (dropPct >= this.takeProfitPct) {
                    logger.info({ event: 'TRAILING_STOP_HIT', price: currentPrice, dropPct });
                    this.closePositions();
                }
            }
        } else if (this.direction === 'short') {
            if (this.lastLowPrice === null || currentPrice < this.lastLowPrice) {
                this.lastLowPrice = currentPrice;
            }
            if (this.volatilityBasedSL) {
                const atr = this.getATR();
                const stopPrice = this.lastLowPrice + this.ATRMultiplier * atr;
                if (currentPrice >= stopPrice) {
                    logger.info({ event: 'TRAILING_STOP_HIT', price: currentPrice, stopPrice });
                    this.closePositions();
                }
            } else if (this.takeProfitPct) {
                const risePct = ((currentPrice - this.lastLowPrice) / this.lastLowPrice) * 100;
                if (risePct >= this.takeProfitPct) {
                    logger.info({ event: 'TRAILING_STOP_HIT', price: currentPrice, risePct });
                    this.closePositions();
                }
            }
        }
    }

    async placeInitialBuys(currentPrice) {
        // IO: Input: currentPrice (Number); Output: Places a series of initial buy orders.
        if (!this.lowerPrice || !this.gridCount) return;
        const step = (this.gridType === 'fixed')
            ? (this.gridSpacing)
            : (currentPrice * this.gridStepPercentage);
        for (let price = currentPrice - step; price >= this.lowerPrice; price -= step) {
            const quantity = this.calculateOrderQuantity(price);
            const order = await this.exchange.placeOrder(this.symbol, 'buy', quantity, price, { reduceOnly: false });
            if (order) {
                this.orders.push(order);
                logger.info({ event: 'PLACE_BUY_ORDER', price, quantity, orderId: order.id });
            }
        }
    }

    async placeInitialSells(currentPrice) {
        // IO: Input: currentPrice (Number); Output: Places a series of initial sell orders.
        if (!this.upperPrice || !this.gridCount) return;
        const step = (this.gridType === 'fixed')
            ? (this.gridSpacing)
            : (currentPrice * this.gridStepPercentage);
        for (let price = currentPrice + step; price <= this.upperPrice; price += step) {
            const quantity = this.calculateOrderQuantity(price);
            const order = await this.exchange.placeOrder(this.symbol, 'sell', quantity, price, { reduceOnly: false });
            if (order) {
                this.orders.push(order);
                logger.info({ event: 'PLACE_SELL_ORDER', price, quantity, orderId: order.id });
            }
        }
    }

    calculateOrderQuantity(price) {
        // IO: Input: price (Number); Output: Returns a calculated order quantity (Number) based on fixed allocation.
        const baseAmount = this.investmentAmount / this.gridCount;
        return baseAmount / price;
    }

    async onOrderFilled(filledOrder) {
        // IO: Input: filledOrder object; Output: Processes the fill, logs the trade, and places subsequent orders.
        this.orders = this.orders.filter(o => o.id !== filledOrder.id);
        logger.info({ event: 'ORDER_FILLED', orderId: filledOrder.id, side: filledOrder.side, price: filledOrder.price, qty: filledOrder.quantity });
        const profit = (filledOrder.side === 'sell')
            ? filledOrder.quantity * filledOrder.price - filledOrder.cost
            : null;
        await Trade.create({
            botId: this.id,
            symbol: this.symbol,
            side: filledOrder.side,
            price: filledOrder.price,
            quantity: filledOrder.quantity,
            profit: profit
        }).catch(err => logger.error("DB Error:", err));

        const price = filledOrder.price;
        if (!this.isFutures) {
            if (filledOrder.side === 'buy') {
                const sellPrice = this.getNextSellPrice(price);
                const sellQty = filledOrder.quantity;
                const order = await this.exchange.placeOrder(this.symbol, 'sell', sellQty, sellPrice, {});
                if (order) {
                    this.orders.push(order);
                    logger.info({ event: 'PLACE_SELL_ORDER', price: sellPrice, quantity: sellQty, linkToBuy: filledOrder.id });
                }
            } else if (filledOrder.side === 'sell') {
                const buyPrice = this.getNextBuyPrice(price);
                const buyQty = this.calculateOrderQuantity(buyPrice);
                const order = await this.exchange.placeOrder(this.symbol, 'buy', buyQty, buyPrice, {});
                if (order) {
                    this.orders.push(order);
                    logger.info({ event: 'PLACE_BUY_ORDER', price: buyPrice, quantity: buyQty, linkToSell: filledOrder.id });
                }
            }
        } else {
            if (this.direction === 'long') {
                if (filledOrder.side === 'buy') {
                    const sellPrice = this.getNextSellPrice(price);
                    const order = await this.exchange.placeOrder(this.symbol, 'sell', filledOrder.quantity, sellPrice, { reduceOnly: true });
                    this.orders.push(order);
                    logger.info({ event: 'PLACE_TP_SELL', price: sellPrice, qty: filledOrder.quantity });
                } else if (filledOrder.side === 'sell') {
                    const buyPrice = this.getNextBuyPrice(price);
                    const buyQty = this.calculateOrderQuantity(buyPrice);
                    const order = await this.exchange.placeOrder(this.symbol, 'buy', buyQty, buyPrice, { reduceOnly: false });
                    this.orders.push(order);
                    logger.info({ event: 'PLACE_BUY_ORDER', price: buyPrice, qty: buyQty });
                }
            } else if (this.direction === 'short') {
                if (filledOrder.side === 'sell') {
                    const buyPrice = this.getNextBuyPrice(price);
                    const order = await this.exchange.placeOrder(this.symbol, 'buy', filledOrder.quantity, buyPrice, { reduceOnly: true });
                    this.orders.push(order);
                    logger.info({ event: 'PLACE_TP_BUY', price: buyPrice, qty: filledOrder.quantity });
                } else if (filledOrder.side === 'buy') {
                    const sellPrice = this.getNextSellPrice(price);
                    const sellQty = this.calculateOrderQuantity(sellPrice);
                    const order = await this.exchange.placeOrder(this.symbol, 'sell', sellQty, sellPrice, { reduceOnly: false });
                    this.orders.push(order);
                    logger.info({ event: 'PLACE_SELL_ORDER', price: sellPrice, qty: sellQty });
                }
            }
        }
    }

    getNextSellPrice(filledPrice) {
        // IO: Input: filledPrice (Number); Output: Returns the price for the next sell order.
        const step = (this.gridType === 'fixed')
            ? (this.gridSpacing || (filledPrice * this.gridStepPercentage))
            : (filledPrice * this.gridStepPercentage);
        return filledPrice + step;
    }

    getNextBuyPrice(filledPrice) {
        // IO: Input: filledPrice (Number); Output: Returns the price for the next buy order.
        const step = (this.gridType === 'fixed')
            ? (this.gridSpacing || (filledPrice * this.gridStepPercentage))
            : (filledPrice * this.gridStepPercentage);
        return Math.max(filledPrice - step, this.lowerPrice || 0);
    }

    async reevaluateGrid() {
        // IO: No input; Output: Cancels all current orders, reinitializes the grid, and places new orders.
        for (let order of this.orders) {
            await this.exchange.cancelOrder(this.symbol, order.id).catch(err => logger.error(err));
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
            } else if (this.direction === 'short') {
                await this.placeInitialSells(currentPrice);
            }
        }
        logger.info({ event: 'GRID_REEVALUATED', currentPrice });
    }

    async closePositions() {
        // IO: No input; Output: For futures, closes positions using a market order then stops the bot.
        if (this.isFutures) {
            const pos = await this.exchange.getPosition(this.symbol);
            if (pos && pos.size !== 0) {
                const side = pos.size > 0 ? 'sell' : 'buy';
                await this.exchange.placeOrder(this.symbol, side, Math.abs(pos.size), null, { reduceOnly: true });
                logger.info({ event: 'CLOSE_POSITION', symbol: this.symbol, side, size: pos.size });
            }
        }
        this.stop();
    }

    getATR() {
        // IO: No input; Output: Returns a placeholder ATR value (Number).
        return this._atr || 0;
    }
}

module.exports = GridBot;
