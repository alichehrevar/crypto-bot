// app/services/botService/GridStrategyService.js

const mongoose = require('mongoose');
const GridBotModel = require('../../models/GridBotModel');
const Order = require('../../models/Order');
const Fill = require('../../models/Fill');
const botLogger = require('../../../logs/botLogger'); // Import the detailed logger

class GridStrategyService {
    constructor(botId, exchangeService) {
        this.botId = botId;
        this.exchangeService = exchangeService;
        this.bot = null;
        this.marketFilters = null;
        this.gridLines = [];
        this.isRunning = false;
    }

    // --- Helper for safe, unified logging ---
    _log(level, message, meta = {}) {
        const logger = botLogger.getLogger(this.botId.toString());
        if (logger && logger[level]) {
            logger[level](message, meta);
        }
    }

    async initialize() {
        this.bot = await GridBotModel.findById(this.botId);
        if (!this.bot) throw new Error(`Bot ${this.botId} not found.`);

        this._log('info', `Initializing Grid Bot ${this.bot.name}...`, { symbol: this.bot.symbol });

        // 1. Fetch real market filters
        this.marketFilters = await this.exchangeService.getMarketFilters(
            this.bot.userId.toString(),
            this.bot.symbol,
            this.bot.accountType,
            this.bot.accountId
        );

        this._log('info', `Market Filters Loaded`, this.marketFilters);

        this._calculateGridLines();

        this.bot.status = 'PAUSED';
        await this.bot.save();
    }

    async start() {
        if (!this.bot || this.bot.status !== 'PAUSED') {
            this.bot = await GridBotModel.findById(this.botId);
        }

        this.isRunning = true;
        this.bot.status = 'RUNNING';
        await this.bot.save();

        this._log('info', `▶️ Grid Bot Started`);

        // Check if we already have orders (resume scenario)
        const existingOrders = await Order.countDocuments({ botId: this.botId, status: 'OPEN' });
        if (existingOrders === 0) {
            await this._seedInitialOrders();
        } else {
            this._log('info', `Resuming with ${existingOrders} existing orders.`);
        }
    }

    async stop() {
        this.isRunning = false;
        this.bot.status = 'STOPPED';
        await this.bot.save();

        this._log('warn', `⏹️ Stop Command Received. Cancelling open orders...`);

        // Cancel all open orders on Exchange
        const openOrders = await Order.find({ botId: this.botId, status: { $in: ['OPEN', 'PARTIALLY_FILLED'] } });
        if (openOrders.length > 0) {
            await this.exchangeService.cancelMultipleOrders(this.bot, openOrders);

            await Order.updateMany(
                { botId: this.botId, status: { $in: ['OPEN', 'PARTIALLY_FILLED'] } },
                { status: 'CANCELED' }
            );

            this._log('info', `Cancelled ${openOrders.length} orders during stop.`);
        }
    }

    async processFill(fillData) {
        if (!this.isRunning) return;

        // Log the raw event immediately
        this._log('info', `⚡ Fill Detected: ${fillData.side} ${fillData.quantity} @ ${fillData.price}`, {
            orderId: fillData.orderId
        });

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const existingFill = await Fill.findOne({ botId: this.botId, exchangeTradeId: fillData.tradeId }).session(session);
            if (existingFill) {
                await session.abortTransaction();
                this._log('warn', `Duplicate fill ignored`, { tradeId: fillData.tradeId });
                return;
            }

            const parentOrder = await Order.findOne({ botId: this.botId, exchangeOrderId: fillData.orderId }).session(session);
            if (!parentOrder) {
                await session.abortTransaction();
                this._log('error', `Fill received for unknown order`, { orderId: fillData.orderId });
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

            // --- THE CORE GRID LOGIC ---
            let childOrderToPlace = null;
            if (isFilled) {
                const { v4: uuidv4 } = await import('uuid');
                const childSide = parentOrder.side === 'BUY' ? 'SELL' : 'BUY';

                // Get next grid level
                const currentIdx = parentOrder.lineIndex;
                const nextIdx = parentOrder.side === 'BUY' ? currentIdx + 1 : currentIdx - 1;

                this._log('info', `🔄 Cycle Triggered: Level ${currentIdx} Filled (${parentOrder.side}). Next Target: Level ${nextIdx} (${childSide})`);

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
                } else {
                    this._log('warn', `⚠️ Grid Out of Bounds! Next index ${nextIdx} is outside range [0, ${this.gridLines.length - 1}]`);
                }
            }

            await session.commitTransaction();

            // Execute Child Order on Exchange
            if (childOrderToPlace) {
                try {
                    this._log('info', `🚀 Placing Next Grid Order: ${childOrderToPlace.side} @ ${childOrderToPlace.price}`);

                    const result = await this.exchangeService.createLimitOrder(this.bot, childOrderToPlace);

                    childOrderToPlace.exchangeOrderId = result.id;
                    childOrderToPlace.status = 'OPEN';
                    await childOrderToPlace.save();

                    this._log('info', `✅ Grid Order Placed Successfully`, { exchangeId: result.id });
                } catch (err) {
                    this._log('error', `❌ Failed to place grid order`, { error: err.message });
                    childOrderToPlace.status = 'FAILED_PLACEMENT';
                    await childOrderToPlace.save();
                }
            }

        } catch (error) {
            console.error(`Error processing fill:`, error);
            this._log('error', `Critical Error in ProcessFill`, { error: error.message });
            await session.abortTransaction();
        } finally {
            session.endSession();
        }
    }

    _calculateGridLines() {
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

        this._log('info', `🧮 Grid Lines Calculated`, {
            mode: gridMode,
            count: this.gridLines.length,
            range: `${lowerPrice} - ${upperPrice}`
        });
    }

    async _seedInitialOrders() {
        const { v4: uuidv4 } = await import('uuid');

        // Fetch current price
        const ticker = await this.exchangeService.getTicker(
            this.bot.userId.toString(),
            this.bot.symbol,
            this.bot.accountType,
            this.bot.accountId
        );
        const currentPrice = ticker.last;

        this._log('info', `🌱 Seeding Grid. Current Market Price: ${currentPrice}`);

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

        if (ordersToPlace.length === 0) {
            this._log('warn', `No initial orders generated. Check grid range vs current price.`);
            return;
        }

        this._log('info', `Generated ${ordersToPlace.length} initial orders. Executing batch...`);

        const createdOrders = await Order.insertMany(ordersToPlace);

        // Execute Batch
        let successCount = 0;
        let failCount = 0;

        for (const order of createdOrders) {
            try {
                const res = await this.exchangeService.createLimitOrder(this.bot, order);
                await Order.updateOne({ _id: order._id }, { status: 'OPEN', exchangeOrderId: res.id });
                successCount++;
            } catch (e) {
                // this._log('error', `Failed to place seed order ${order.side} @ ${order.price}`, { error: e.message });
                await Order.updateOne({ _id: order._id }, { status: 'FAILED_PLACEMENT' });
                failCount++;
            }
        }

        this._log('info', `Seeding Complete. Success: ${successCount}, Failed: ${failCount}`);
    }

    _calculateOrderQuantity() {
        const { investment } = this.bot;
        const { gridCount, lowerPrice, upperPrice } = this.bot.gridConfig;

        if (this.bot.marketType === 'SPOT') {
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
