const mongoose = require('mongoose');
const GridBotModel = require('../../models/GridBotModel');
const Order = require('../../models/Order');
const Fill = require('../../models/Fill');
const logger = require('../../../logs/logger');

class GridStrategyService {
    constructor(botId, exchangeService) {
        this.botId = botId;
        this.exchangeService = exchangeService;
        this.bot = null;
        this.marketFilters = null;
        this.gridLines = [];
        this.isRunning = false;
    }

    async initialize() {
        this.bot = await GridBotModel.findById(this.botId);
        if (!this.bot) throw new Error(`Bot ${this.botId} not found.`);

        // 1. Fetch real market filters (Precision, Min Notional)
        // This ensures we don't send invalid prices to Binance/OKX
        this.marketFilters = await this.exchangeService.getMarketFilters(
            this.bot.userId.toString(),
            this.bot.symbol,
            this.bot.accountType,
            this.bot.accountId
        );

        this._calculateGridLines();

        this.bot.status = 'PAUSED';
        await this.bot.save();
        logger.info(`Grid Bot ${this.bot.name} initialized.`);
    }

    async start() {
        if (!this.bot || this.bot.status !== 'PAUSED') {
            // Reload in case it was just initialized
            this.bot = await GridBotModel.findById(this.botId);
        }

        this.isRunning = true;
        this.bot.status = 'RUNNING';
        await this.bot.save();

        // Check if we already have orders (resume scenario)
        const existingOrders = await Order.countDocuments({ botId: this.botId, status: 'OPEN' });
        if (existingOrders === 0) {
            await this._seedInitialOrders();
        }
    }

    async stop() {
        this.isRunning = false;
        this.bot.status = 'STOPPED';
        await this.bot.save();

        // Cancel all open orders on Exchange
        const openOrders = await Order.find({ botId: this.botId, status: { $in: ['OPEN', 'PARTIALLY_FILLED'] } });
        if (openOrders.length > 0) {
            await this.exchangeService.cancelMultipleOrders(this.bot, openOrders);
            // Update DB status
            await Order.updateMany(
                { botId: this.botId, status: { $in: ['OPEN', 'PARTIALLY_FILLED'] } },
                { status: 'CANCELED' }
            );
        }
    }

    async processFill(fillData) {
        if (!this.isRunning) return;

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const existingFill = await Fill.findOne({ botId: this.botId, exchangeTradeId: fillData.tradeId }).session(session);
            if (existingFill) {
                await session.abortTransaction();
                return;
            }

            const parentOrder = await Order.findOne({ botId: this.botId, exchangeOrderId: fillData.orderId }).session(session);
            if (!parentOrder) {
                await session.abortTransaction();
                return;
            }

            // Record Fill
            await new Fill({
                botId: this.botId,
                userId: this.bot.userId,
                orderId: parentOrder._id,
                exchangeTradeId: fillData.tradeId,
                exchangeOrderId: fillData.orderId,
                symbol: fillData.symbol,
                price: fillData.price,
                quantity: fillData.quantity,
                fee: fillData.fee || 0,
                feeCurrency: fillData.feeCurrency || 'USDT',
                side: fillData.side.toUpperCase(),
                timestamp: new Date(fillData.timestamp),
            }).save({ session });

            // Update Parent
            parentOrder.filledQuantity += fillData.quantity;
            const isFilled = parentOrder.filledQuantity >= parentOrder.quantity * 0.99; // 1% tolerance
            parentOrder.status = isFilled ? 'FILLED' : 'PARTIALLY_FILLED';
            await parentOrder.save({ session });

            // Update Bot Position (Futures)
            if (this.bot.marketType === 'FUTURES') {
                const posChange = parentOrder.side === 'BUY' ? fillData.quantity : -fillData.quantity;
                await GridBotModel.updateOne({ _id: this.botId }, { $inc: { positionContracts: posChange } }).session(session);
            }

            // Create Child Order (The Grid Logic)
            let childOrderToPlace = null;
            if (isFilled) {
                const { v4: uuidv4 } = await import('uuid');
                const childSide = parentOrder.side === 'BUY' ? 'SELL' : 'BUY';

                // Get next grid level
                const currentIdx = parentOrder.lineIndex;
                const nextIdx = parentOrder.side === 'BUY' ? currentIdx + 1 : currentIdx - 1;

                // Ensure boundaries
                if (nextIdx >= 0 && nextIdx < this.gridLines.length) {
                    const childPrice = this.gridLines[nextIdx];

                    childOrderToPlace = new Order({
                        botId: this.botId,
                        userId: this.bot.userId,
                        clientOrderId: `grid-${this.botId}-${uuidv4()}`,
                        symbol: this.bot.symbol,
                        side: childSide,
                        price: this._roundToTick(childPrice),
                        quantity: this._floorToStep(parentOrder.quantity), // maintain size
                        status: 'PENDING_PLACEMENT',
                        reduceOnly: this.bot.marketType === 'FUTURES',
                        lineIndex: nextIdx,
                    });
                    await childOrderToPlace.save({ session });
                }
            }

            await session.commitTransaction();

            // Execute on Exchange
            if (childOrderToPlace) {
                const result = await this.exchangeService.createLimitOrder(this.bot, childOrderToPlace);
                // Update DB with exchange IDs
                childOrderToPlace.exchangeOrderId = result.id;
                childOrderToPlace.status = 'OPEN';
                await childOrderToPlace.save();
            }

        } catch (error) {
            console.error(`Error processing fill:`, error);
            await session.abortTransaction();
        } finally {
            session.endSession();
        }
    }

    _calculateGridLines() {
        // FIX: Destructure from gridConfig, NOT this.bot
        const { lowerPrice, upperPrice, gridCount, gridMode } = this.bot.gridConfig;

        this.gridLines = [];
        if (gridMode === 'arithmetic') {
            const step = (upperPrice - lowerPrice) / gridCount;
            for (let i = 0; i <= gridCount; i++) {
                this.gridLines.push(lowerPrice + i * step);
            }
        } else {
            const ratio = Math.pow(upperPrice / lowerPrice, 1 / gridCount);
            for (let i = 0; i <= gridCount; i++) {
                this.gridLines.push(lowerPrice * Math.pow(ratio, i));
            }
        }
    }

    async _seedInitialOrders() {
        const { v4: uuidv4 } = await import('uuid');

        // Fetch current price to decide where to split Buy/Sell
        const ticker = await this.exchangeService.getTicker(
            this.bot.userId.toString(),
            this.bot.symbol,
            this.bot.accountType,
            this.bot.accountId
        );
        const currentPrice = ticker.last;

        const quantityPerOrder = this._calculateOrderQuantity();
        const ordersToPlace = [];

        for (let i = 0; i < this.gridLines.length; i++) {
            const price = this.gridLines[i];
            let side = null;

            if (price < currentPrice) side = 'BUY';
            else if (price > currentPrice) side = 'SELL';

            // Skip placing orders too close to current price (spread protection)
            if (!side || Math.abs(price - currentPrice) / currentPrice < 0.002) continue;

            // Spot: Only place BUYs below price. Futures: Can place SELLS above price.
            if (this.bot.marketType === 'SPOT' && side === 'SELL') continue;

            ordersToPlace.push({
                botId: this.botId,
                userId: this.bot.userId,
                clientOrderId: `grid-${this.botId}-${uuidv4()}`,
                symbol: this.bot.symbol,
                side,
                price: this._roundToTick(price),
                quantity: this._floorToStep(quantityPerOrder),
                status: 'PENDING_PLACEMENT',
                lineIndex: i,
            });
        }

        const createdOrders = await Order.insertMany(ordersToPlace);

        // Execute Batch
        // Note: Real exchanges have rate limits. Production code should batch these in groups of 5 or 10.
        for (const order of createdOrders) {
            try {
                const res = await this.exchangeService.createLimitOrder(this.bot, order);
                await Order.updateOne({ _id: order._id }, { status: 'OPEN', exchangeOrderId: res.id });
            } catch (e) {
                console.error(`Failed to place seed order ${order.side} @ ${order.price}: ${e.message}`);
                await Order.updateOne({ _id: order._id }, { status: 'FAILED_PLACEMENT' });
            }
        }
    }

    _calculateOrderQuantity() {
        // Fix: Use gridConfig
        const { investment } = this.bot;
        const { gridCount, lowerPrice, upperPrice } = this.bot.gridConfig;

        if (this.bot.marketType === 'SPOT') {
            // Simple logic: Investment / Grids = Amount per grid (in USDT)
            // Quantity = Amount / AvgPrice
            const avgPrice = (lowerPrice + upperPrice) / 2;
            return (investment / gridCount) / avgPrice;
        }
        return (investment / gridCount) / ((lowerPrice + upperPrice) / 2);
    }

    _roundToTick(price) {
        if(!this.marketFilters) return price;
        const tick = this.marketFilters.tickSize;
        return Math.floor(price / tick) * tick;
    }

    _floorToStep(quantity) {
        if(!this.marketFilters) return quantity;
        const step = this.marketFilters.stepSize;
        return Math.floor(quantity / step) * step;
    }
}

module.exports = GridStrategyService;
