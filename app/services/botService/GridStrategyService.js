const mongoose = require('mongoose');
const GridBotModel = require('../../models/GridBotModel');
const Order = require('../../models/Order');
const Fill = require('../../models/Fill');
// NOTE: We assume an ExchangeService exists for market data and order execution.
// const ExchangeService = require('./ExchangeService');

/**
 * GridStrategyService
 * Manages the complete lifecycle and trading logic for a single grid bot instance.
 */
class GridStrategyService {
    /**
     * @param {string} botId The MongoDB ObjectId of the bot.
     * @param {object} exchangeService An instance of a connected exchange service/adapter.
     */
    constructor(botId, exchangeService) {
        this.botId = botId;
        this.exchangeService = exchangeService;
        this.bot = null;
        this.marketFilters = null;
        this.gridLines = [];
        this.isRunning = false;

        console.log(`GridStrategyService initialized for botId: ${botId}`);
    }

    /**
     * Initializes the bot state, fetches market data, and calculates grid lines.
     * This must be called before starting the bot.
     */
    async initialize() {
        this.bot = await GridBotModel.findById(this.botId);
        if (!this.bot) {
            throw new Error(`Bot with ID ${this.botId} not found.`);
        }

        // Fetch market precision filters (tickSize, stepSize, etc.)
        // this.marketFilters = await this.exchangeService.getMarketFilters(this.bot.symbol);
        // MOCK FILTERS for now:
        this.marketFilters = { tickSize: 0.1, stepSize: 0.001, minNotional: 10 };

        this._calculateGridLines();

        this.bot.status = 'PAUSED'; // Ready to start
        await this.bot.save();
        console.log(`Bot ${this.botId} initialized successfully.`);
    }

    /**
     * Starts the bot's trading activity by seeding the initial orders.
     */
    async start() {
        if (!this.bot || this.bot.status !== 'PAUSED') {
            throw new Error('Bot must be initialized and in PAUSED state to start.');
        }

        console.log(`Starting bot ${this.botId}...`);
        this.isRunning = true;
        this.bot.status = 'RUNNING';
        await this.bot.save();

        await this._seedInitialOrders();
    }

    /**
     * Stops the bot, cancels all open orders, and optionally flattens the position.
     */
    async stop() {
        this.isRunning = false;
        this.bot.status = 'STOPPED';
        await this.bot.save();

        // 1. Fetch all open orders for this bot from our DB
        const openOrders = await Order.find({ botId: this.botId, status: { $in: ['OPEN', 'PARTIALLY_FILLED'] } });

        // 2. Cancel all orders on the exchange
        // await this.exchangeService.cancelMultipleOrders(openOrders);

        // 3. Optionally flatten the position for futures bots
        if (this.bot.marketType === 'FUTURES' && this.bot.flattenOnExit && this.bot.positionContracts !== 0) {
            // await this.exchangeService.createMarketOrder({ ...params to close position });
        }

        console.log(`Bot ${this.botId} stopped.`);
    }

    /**
     * Core reactive logic: processes a trade fill from the exchange.
     * This method is designed to be transactional and idempotent.
     * @param {object} fillData The trade data from the exchange websocket.
     */
    async processFill(fillData) {
        if (!this.isRunning) return;

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // 1. Idempotency: Check if this fill has already been processed.
            const existingFill = await Fill.findOne({ botId: this.botId, exchangeTradeId: fillData.tradeId }).session(session);
            if (existingFill) {
                console.log(`Duplicate fill detected, ignoring. TradeID: ${fillData.tradeId}`);
                await session.abortTransaction();
                session.endSession();
                return;
            }

            // 2. Find the parent order that was filled.
            const parentOrder = await Order.findOne({ botId: this.botId, exchangeOrderId: fillData.orderId }).session(session);
            if (!parentOrder) {
                // This fill is not related to our bot's orders.
                await session.abortTransaction();
                session.endSession();
                return;
            }

            // 3. Record the fill to prevent reprocessing.
            await new Fill({
                botId: this.botId,
                userId: this.bot.userId,
                orderId: parentOrder._id,
                exchangeTradeId: fillData.tradeId,
                exchangeOrderId: fillData.orderId,
                symbol: fillData.symbol,
                price: fillData.price,
                quantity: fillData.quantity,
                fee: fillData.fee,
                feeCurrency: fillData.feeCurrency,
                side: fillData.side.toUpperCase(),
                timestamp: new Date(fillData.timestamp),
            }).save({ session });


            // 4. Update parent order status and bot profit
            parentOrder.filledQuantity += fillData.quantity;
            const isFilled = parentOrder.filledQuantity >= parentOrder.quantity * 0.999; // Allow for dust
            parentOrder.status = isFilled ? 'FILLED' : 'PARTIALLY_FILLED';
            await parentOrder.save({ session });

            // 5. Atomically update bot's position (for Futures)
            if (this.bot.marketType === 'FUTURES') {
                const positionDelta = parentOrder.side === 'BUY' ? fillData.quantity : -fillData.quantity;
                await GridBotModel.updateOne({ _id: this.botId }, { $inc: { positionContracts: positionDelta } }).session(session);
            }

            // 6. If the parent order is fully filled, create the paired child order.
            let childOrderToPlace = null;
            if (isFilled) {
                const { v4: uuidv4 } = await import('uuid');
                const childSide = parentOrder.side === 'BUY' ? 'SELL' : 'BUY';
                const priceStep = this.gridLines[1] - this.gridLines[0]; // Assumes arithmetic for simplicity
                const childPrice = parentOrder.side === 'BUY' ? parentOrder.price + priceStep : parentOrder.price - priceStep;

                const childOrder = new Order({
                    botId: this.botId,
                    userId: this.bot.userId,
                    clientOrderId: `grid-${this.botId.toString()}-${uuidv4()}`,
                    symbol: this.bot.symbol,
                    side: childSide,
                    price: this._roundToTick(childPrice),
                    quantity: this._floorToStep(parentOrder.quantity),
                    status: 'PENDING_PLACEMENT',
                    reduceOnly: this.bot.marketType === 'FUTURES', // Paired orders are always closing
                    lineIndex: parentOrder.lineIndex + (parentOrder.side === 'BUY' ? 1 : -1),
                });
                await childOrder.save({ session });
                childOrderToPlace = childOrder;
            }

            // If all DB operations succeed, commit the transaction.
            await session.commitTransaction();
            session.endSession();

            // 7. Post-Transaction: Execute the API call to place the new order.
            if (childOrderToPlace) {
                // const placementResult = await this.exchangeService.createLimitOrder(childOrderToPlace);
                // After placement, update the order in DB with exchangeOrderId and set status to 'OPEN'.
                console.log(`Placed paired order: ${childOrderToPlace.side} ${childOrderToPlace.quantity} @ ${childOrderToPlace.price}`);
            }

        } catch (error) {
            console.error(`Error processing fill for bot ${this.botId}:`, error);
            await session.abortTransaction();
            session.endSession();
        }
    }


    // --- Private Helper Methods ---

    /**
     * Calculates and stores the grid price lines based on bot configuration.
     */
    _calculateGridLines() {
        const { lowerPrice, upperPrice, grids, gridMode } = this.bot;
        this.gridLines = [];

        if (gridMode === 'ARITHMETIC') {
            const step = (upperPrice - lowerPrice) / grids;
            for (let i = 0; i <= grids; i++) {
                this.gridLines.push(lowerPrice + i * step);
            }
        } else { // GEOMETRIC
            const ratio = Math.pow(upperPrice / lowerPrice, 1 / grids);
            for (let i = 0; i <= grids; i++) {
                this.gridLines.push(lowerPrice * Math.pow(ratio, i));
            }
        }
        console.log(`Calculated ${this.gridLines.length} grid lines for bot ${this.botId}.`);
    }

    /**
     * Places the initial set of orders based on the strategy and current price.
     */
    async _seedInitialOrders() {
        const { v4: uuidv4 } = await import('uuid');
        // const currentPrice = await this.exchangeService.getCurrentPrice(this.bot.symbol);
        const currentPrice = 65000; // Mock price

        const quantityPerOrder = this._calculateOrderQuantity();
        if (quantityPerOrder <= 0) {
            throw new Error('Calculated order quantity is zero. Check investment amount.');
        }

        const ordersToPlace = [];
        for (let i = 0; i < this.gridLines.length; i++) {
            const price = this.gridLines[i];
            let side = null;

            if (price < currentPrice) {
                side = 'BUY';
            } else if (price > currentPrice) {
                side = 'SELL';
            } else {
                continue; // Don't place order exactly at current price
            }

            // For Spot, only place BUYs initially.
            if (this.bot.marketType === 'SPOT' && side === 'SELL') {
                continue;
            }

            ordersToPlace.push({
                botId: this.botId,
                userId: this.bot.userId,
                clientOrderId: `grid-${this.botId.toString()}-${uuidv4()}`,
                symbol: this.bot.symbol,
                side,
                price: this._roundToTick(price),
                quantity: this._floorToStep(quantityPerOrder),
                status: 'PENDING_PLACEMENT',
                reduceOnly: false, // Initial orders are never ReduceOnly
                lineIndex: i,
            });
        }

        // Save orders to DB first
        const createdOrders = await Order.insertMany(ordersToPlace);

        // Then place them on the exchange
        // await this.exchangeService.createMultipleLimitOrders(createdOrders);
        console.log(`Seeded ${createdOrders.length} initial orders for bot ${this.botId}.`);
    }

    /**
     * Calculates the quantity 'q' for each grid order.
     * This is a simplified version; a real implementation needs to handle
     * different sizing modes and futures margin calculations as per your docs.
     */
    _calculateOrderQuantity() {
        if (this.bot.marketType === 'SPOT') {
            // As per 'spot grid bot.docx', for single-asset mode:
            // q = Investment / (sum of seeded buy prices)
            const buyPrices = this.gridLines.filter(p => p < 65000); // Mock price
            const sumOfBuyPrices = buyPrices.reduce((acc, price) => acc + price, 0);
            if (sumOfBuyPrices === 0) return 0;
            return this.bot.investment / sumOfBuyPrices;
        } else { // FUTURES
            // Sizing for futures is more complex, involving leverage and margin.
            // For now, we'll use a simplified approach.
            // (Total Investment * Leverage) / (Number of Grids * Avg Price)
            const avgPrice = (this.bot.lowerPrice + this.bot.upperPrice) / 2;
            return (this.bot.investment * this.bot.leverage) / (this.bot.grids * avgPrice);
        }
    }

    _roundToTick(price) {
        return Math.round(price / this.marketFilters.tickSize) * this.marketFilters.tickSize;
    }

    _floorToStep(quantity) {
        return Math.floor(quantity / this.marketFilters.stepSize) * this.marketFilters.stepSize;
    }
}

module.exports = GridStrategyService;

