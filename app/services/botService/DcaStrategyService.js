const mongoose = require('mongoose');
const DcaBot = require('../../models/DcaBot');
const DcaOrder = require('../../models/DcaOrder');
const ExchangeService = require('./ExchangeService'); // This is now the real service
const logger = require('../../../logs/logger');

class DcaStrategyService {
    /**
     * @param {string} botId The ID of the bot this service instance manages.
     */
    constructor(botId) {
        this.botId = botId;
        this.bot = null;
        this.exchange = null; // This will hold the user-specific ccxt instance
        this.market = null; // This will hold market data like precision
    }

    /**
     * Initializes the service, fetching bot data and the user-specific exchange connection.
     */
    async initialize() {
        this.bot = await DcaBot.findById(this.botId).populate('userId');
        if (!this.bot) {
            throw new Error(`DCA Bot with id ${this.botId} not found.`);
        }
        if (!this.bot.userId) {
            throw new Error(`Bot ${this.botId} is not associated with a user.`);
        }

        // Get the user-specific ccxt instance from the centralized service
        this.exchange = ExchangeService.exchanges.get(this.bot.userId._id.toString());
        if (!this.exchange) {
            throw new Error(`No active exchange connection for user ${this.bot.userId._id}`);
        }

        // Load market data to get trading rules (precision, limits, etc.)
        await this.exchange.loadMarkets();
        this.market = this.exchange.market(this.bot.symbol);
        if (!this.market) {
            throw new Error(`Symbol ${this.bot.symbol} not found on exchange ${this.exchange.id}`);
        }

        logger.info({ botId: this.botId, exchange: this.exchange.id }, 'DCA Strategy Service initialized.');
    }

    /**
     * Prepares and executes the initial orders to start a new trading cycle.
     */
    async startNewDeal() {
        if (!this.bot || this.bot.activeDeal) return;

        logger.info({ botId: this.botId }, "Starting new DCA deal cycle.");
        const referencePrice = (await this.exchange.fetchTicker(this.bot.symbol)).last;

        const session = await mongoose.startSession();
        const preparedOrderIds = [];

        try {
            await session.withTransaction(async () => {
                const baseOrderVolume = this.bot.baseOrderVolume;
                let order;

                if (this.bot.direction === 'NEUTRAL') {
                    // OCO Entry for Neutral Strategy
                    const deviation = this.bot.neutralEntryDeviation / 100;
                    const longPrice = referencePrice * (1 - deviation);
                    const shortPrice = referencePrice * (1 + deviation);

                    order = await this.prepareOrder(session, 'BASE', baseOrderVolume, longPrice, 'buy');
                    preparedOrderIds.push(order.id);
                    order = await this.prepareOrder(session, 'BASE', baseOrderVolume, shortPrice, 'sell');
                    preparedOrderIds.push(order.id);

                } else {
                    // Directional Entry
                    const entrySide = this.bot.direction === 'LONG' ? 'buy' : 'sell';
                    const price = this.bot.useMarketForEntry ? null : referencePrice;
                    order = await this.prepareOrder(session, 'BASE', baseOrderVolume, price, entrySide);
                    preparedOrderIds.push(order.id);
                }

                this.bot.activeDeal = true;
                this.bot.averageEntryPrice = 0;
                this.bot.totalVolume = 0;
                this.bot.positionContracts = 0;
                this.bot.activeDirection = null;
                await this.bot.save({ session });
            });

            logger.info({ botId: this.botId, orders: preparedOrderIds.length }, 'New deal transaction committed.');

            // After transaction success, execute the orders
            for (const orderId of preparedOrderIds) {
                await this.executeOrder(orderId);
            }

        } catch (error) {
            logger.error({ botId: this.botId, error: error.message, stack: error.stack }, "Failed to start new deal.");
            // Handle potential cleanup if needed
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Processes a trade fill event from the exchange.
     * @param {object} trade - The trade data from a ccxt fill event.
     */
    async processFill(trade) {
        // ... Logic from processSingleFill in RTF ...
        // This will be the next complex part to implement fully.
        // It will involve a transaction to update bot state and prepare new orders,
        // followed by executing those new orders.
        logger.info({ botId: this.botId, trade }, 'Processing fill.');
    }

    /**
     * Creates an order document within a DB transaction. Does not place the order.
     */
    async prepareOrder(session, type, volume, price, side) {
        const { v4: uuidv4 } = await import('uuid');
        const clientOrderId = uuidv4();
        let qty;

        // Use ccxt helper functions for precision formatting
        if (price) { // Limit Order
            const cost = volume;
            qty = this.exchange.amountToPrecision(this.bot.symbol, cost / price);
            price = this.exchange.priceToPrecision(this.bot.symbol, price);
        } else { // Market Order
            const currentPrice = (await this.exchange.fetchTicker(this.bot.symbol)).last;
            qty = this.exchange.amountToPrecision(this.bot.symbol, volume / currentPrice);
        }

        // Apply leverage for futures
        if (this.bot.marketType === 'FUTURES') {
            qty = parseFloat(qty) * this.bot.leverage;
            qty = this.exchange.amountToPrecision(this.bot.symbol, qty);
        }

        const orderData = {
            botId: this.botId,
            type,
            side,
            price,
            qty: parseFloat(qty),
            clientOrderId,
            status: 'PENDING_PLACEMENT',
        };

        const order = new DcaOrder(orderData);
        await order.save({ session });
        return order;
    }

    /**
     * Places a prepared order on the exchange using the live ccxt instance.
     * Updates the order status in the database based on the result.
     * @param {string} orderId The MongoDB ID of the order to execute.
     */
    async executeOrder(orderId) {
        const order = await DcaOrder.findById(orderId);
        if (!order || order.status !== 'PENDING_PLACEMENT') {
            logger.warn({ orderId }, 'Execute called on an invalid or already processed order.');
            return;
        }

        try {
            logger.info({ botId: this.botId, orderId, side: order.side, qty: order.qty, price: order.price }, 'Placing order on exchange...');

            let exchangeOrder;
            const orderType = order.price ? 'limit' : 'market';
            const params = {}; // For extra params like reduceOnly for futures

            exchangeOrder = await this.exchange.createOrder(
                this.bot.symbol,
                orderType,
                order.side,
                order.qty,
                order.price,
                params
            );

            order.exchangeOrderId = exchangeOrder.id;
            order.status = 'OPEN';
            await order.save();
            logger.info({ botId: this.botId, orderId: order.id, exchangeOrderId: exchangeOrder.id }, 'Order placed successfully.');

        } catch (error) {
            order.status = 'FAILED_PLACEMENT';
            await order.save();
            logger.error({ botId: this.botId, orderId, error: error.message }, 'Failed to place order on exchange.');
            // Here you might want to stop the bot or implement retry logic
            throw error; // Propagate error to be handled by the caller
        }
    }
}

module.exports = DcaStrategyService;

