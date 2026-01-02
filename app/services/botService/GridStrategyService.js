// app/services/botService/GridStrategyService.js

const mongoose = require('mongoose');
const GridBotModel = require('../../models/GridBotModel');
const Order = require('../../models/Order');
const Fill = require('../../models/Fill');
const botLogger = require('../../../logs/botLogger');
const ExchangeService = require('./ExchangeService');

class GridStrategyService {
    constructor(botId) {
        this.botId = botId;
        this.exchangeService = ExchangeService;
        this.bot = null;
        this.marketFilters = null;
        this.gridLines = [];
        this.isRunning = false;
    }

    // --- Helper for Safe Logging ---
    _log(level, message, meta = {}) {
        const logger = botLogger.getLogger(this.botId.toString());
        if (logger && logger[level]) {
            logger[level](message, meta);
        }
    }

    async initialize() {
        this.bot = await GridBotModel.findById(this.botId);
        if (!this.bot) throw new Error(`Bot ${this.botId} not found.`);

        this._log('info', `🤖 Initializing Grid Bot: ${this.bot.name}`, {
            symbol: this.bot.symbol,
            accountType: this.bot.accountType
        });

        try {
            // 1. Fetch real market filters
            this.marketFilters = await this.exchangeService.getMarketFilters(
                this.bot.userId.toString(),
                this.bot.symbol,
                this.bot.accountType,
                this.bot.accountId
            );

            this._log('info', `📏 Market Filters Applied`, {
                tickSize: this.marketFilters.tickSize,
                stepSize: this.marketFilters.stepSize
            });

            this._calculateGridLines();

            this.bot.status = 'PAUSED';
            await this.bot.save();

        } catch (error) {
            this._log('error', `❌ Initialization Error: ${error.message}`, { stack: error.stack });
            throw error;
        }
    }

    async start() {
        try {
            if (!this.bot) await this.initialize();
            this.bot = await GridBotModel.findById(this.botId);

            this.isRunning = true;
            this.bot.status = 'RUNNING';
            await this.bot.save();

            this._log('info', `▶️ Grid Bot Started`);

            const existingOrders = await Order.countDocuments({ botId: this.botId, status: 'OPEN' });
            if (existingOrders === 0) {
                await this._seedInitialOrders();
            } else {
                this._log('info', `♻️ Resuming Session`, { existingOrders });
            }
        } catch (error) {
            this._log('error', `❌ Failed to Start: ${error.message}`);
            throw error;
        }
    }

    async stop() {
        this.isRunning = false;
        this.bot.status = 'STOPPED';
        await this.bot.save();

        this._log('warn', `⏹️ Stopping Grid Bot...`);

        const openOrders = await Order.find({ botId: this.botId, status: { $in: ['OPEN', 'PARTIALLY_FILLED'] } });
        if (openOrders.length > 0) {
            await this.exchangeService.cancelMultipleOrders(this.bot, openOrders);

            await Order.updateMany(
                { botId: this.botId, status: { $in: ['OPEN', 'PARTIALLY_FILLED'] } },
                { status: 'CANCELED' }
            );

            this._log('info', `✅ Cancelled ${openOrders.length} orders during stop.`);
        }
    }

    async processFill(fillData) {
        if (!this.isRunning) return;

        this._log('info', `⚡ Fill Detected: ${fillData.side} ${fillData.quantity} @ ${fillData.price}`, {
            orderId: fillData.orderId,
            tradeId: fillData.tradeId
        });

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
            const isFilled = parentOrder.filledQuantity >= parentOrder.quantity * 0.99;
            parentOrder.status = isFilled ? 'FILLED' : 'PARTIALLY_FILLED';
            await parentOrder.save({ session });

            if (this.bot.marketType === 'FUTURES') {
                const posChange = parentOrder.side === 'BUY' ? fillData.quantity : -fillData.quantity;
                await GridBotModel.updateOne({ _id: this.botId }, { $inc: { positionContracts: posChange } }).session(session);
            }

            // --- REACTION LOGIC ---
            let childOrderToPlace = null;
            if (isFilled) {
                const { v4: uuidv4 } = await import('uuid');
                const childSide = parentOrder.side === 'BUY' ? 'SELL' : 'BUY';

                const currentIdx = parentOrder.lineIndex;
                const nextIdx = parentOrder.side === 'BUY' ? currentIdx + 1 : currentIdx - 1;

                this._log('info', `🔄 Cycle Triggered`, {
                    filledLevel: currentIdx,
                    nextLevel: nextIdx,
                    action: `Placing ${childSide}`
                });

                if (nextIdx >= 0 && nextIdx < this.gridLines.length) {
                    const childPrice = this.gridLines[nextIdx];

                    childOrderToPlace = new Order({
                        botId: this.botId,
                        userId: this.bot.userId,
                        clientOrderId: `grid-${this.botId}-${uuidv4()}`,
                        symbol: this.bot.symbol,
                        side: childSide,
                        price: this._roundToTick(childPrice),
                        quantity: this._floorToStep(parentOrder.quantity),
                        status: 'PENDING_PLACEMENT',
                        reduceOnly: this.bot.marketType === 'FUTURES',
                        lineIndex: nextIdx,
                    });
                    await childOrderToPlace.save({ session });
                } else {
                    this._log('warn', `⚠️ Grid Boundary Reached. Waiting for price to return.`);
                }
            }

            await session.commitTransaction();

            if (childOrderToPlace) {
                try {
                    this._log('info', `🚀 Placing Reaction Order: ${childOrderToPlace.side} @ ${childOrderToPlace.price}`);

                    const result = await this.exchangeService.createLimitOrder(this.bot, childOrderToPlace);

                    childOrderToPlace.exchangeOrderId = result.id;
                    childOrderToPlace.status = 'OPEN';
                    await childOrderToPlace.save();

                    this._log('info', `✅ Reaction Order Open`, { exchangeId: result.id });
                } catch (err) {
                    this._log('error', `❌ Failed to place reaction order`, { error: err.message });
                    childOrderToPlace.status = 'FAILED_PLACEMENT';
                    await childOrderToPlace.save();
                }
            }

        } catch (error) {
            console.error(`Error processing fill:`, error);
            this._log('error', `ProcessFill Exception`, { error: error.message });
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
            for (let i = 0; i <= gridCount; i++) this.gridLines.push(lowerPrice + i * step);
        } else {
            const ratio = Math.pow(upperPrice / lowerPrice, 1 / gridCount);
            for (let i = 0; i <= gridCount; i++) this.gridLines.push(lowerPrice * Math.pow(ratio, i));
        }

        this._log('info', `🧮 Grid Calculation Complete`, {
            range: `${lowerPrice} - ${upperPrice}`,
            lines: this.gridLines.length
        });
    }

    async _seedInitialOrders() {
        const { v4: uuidv4 } = await import('uuid');

        const ticker = await this.exchangeService.getTicker(
            this.bot.userId.toString(),
            this.bot.symbol,
            this.bot.accountType,
            this.bot.accountId
        );
        const currentPrice = ticker.last;

        this._log('info', `🌱 Seeding Grid. Market Price: ${currentPrice}`);

        // --- CRITICAL FIX: Ensure quantity is a valid number ---
        const quantityPerOrder = this._calculateOrderQuantity();

        if (isNaN(quantityPerOrder) || quantityPerOrder <= 0) {
            this._log('error', `❌ Invalid Order Quantity calculated: ${quantityPerOrder}. Check investment amount.`);
            return;
        }

        const ordersToPlace = [];

        for (let i = 0; i < this.gridLines.length; i++) {
            const price = this.gridLines[i];
            let side = null;

            if (price < currentPrice) side = 'BUY';
            else if (price > currentPrice) side = 'SELL';

            if (!side || Math.abs(price - currentPrice) / currentPrice < 0.002) continue;
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
            this._log('warn', `⚠️ No Seed Orders Generated. Grid lines too close to price.`);
            return;
        }

        this._log('info', `📦 Generated ${ordersToPlace.length} Initial Orders`);

        const createdOrders = await Order.insertMany(ordersToPlace);
        this._log('info', `🚀 Executing Batch...`);

        let successCount = 0;
        let failCount = 0;

        for (const order of createdOrders) {
            try {
                const res = await this.exchangeService.createLimitOrder(this.bot, order);
                await Order.updateOne({ _id: order._id }, { status: 'OPEN', exchangeOrderId: res.id });
                successCount++;
            } catch (e) {
                await Order.updateOne({ _id: order._id }, { status: 'FAILED_PLACEMENT' });
                failCount++;
            }
        }

        this._log('info', `✅ Seeding Complete`, { success: successCount, failed: failCount });
    }

    _calculateOrderQuantity() {
        // FIX: The controller saves investment in marketInfo.tradeFund, not root .investment
        const investment = this.bot.investment || this.bot.marketInfo?.tradeFund || 0;

        const { gridCount, lowerPrice, upperPrice } = this.bot.gridConfig;

        if (!investment || investment <= 0) {
            this._log('warn', `⚠️ Investment amount is 0 or missing. Cannot calculate grid quantity.`);
            return 0;
        }

        const avgPrice = (lowerPrice + upperPrice) / 2;

        // Avoid division by zero
        if (avgPrice === 0) return 0;

        return (investment / gridCount) / avgPrice;
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
