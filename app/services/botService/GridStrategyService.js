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

        // Timer for paper trading simulation
        this._tickInterval = null;
    }

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
            accountType: this.bot.accountType,
            mode: this.bot.mode // Log mode
        });

        try {
            // 1. Fetch real market filters (needed for precision even in paper mode)
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

            this._log('info', `▶️ Grid Bot Started (${this.bot.mode.toUpperCase()})`);

            // Seed orders if empty
            const existingOrders = await Order.countDocuments({ botId: this.botId, status: 'OPEN' });
            if (existingOrders === 0) {
                await this._seedInitialOrders();
            } else {
                this._log('info', `♻️ Resuming Session`, { existingOrders });
            }

            // Start Watchdog (For Paper Simulation & General Monitoring)
            if (this._tickInterval) clearInterval(this._tickInterval);
            this._tickInterval = setInterval(() => {
                this.onTick().catch(err =>
                    this._log('error', 'Watchdog Tick Error', { error: err.message })
                );
            }, 4000); // Check every 4 seconds

        } catch (error) {
            this._log('error', `❌ Failed to Start: ${error.message}`);
            throw error;
        }
    }

    async stop() {
        this.isRunning = false;
        if (this._tickInterval) {
            clearInterval(this._tickInterval);
            this._tickInterval = null;
        }

        this.bot.status = 'STOPPED';
        await this.bot.save();

        this._log('warn', `⏹️ Stopping Grid Bot...`);

        const openOrders = await Order.find({ botId: this.botId, status: { $in: ['OPEN', 'PARTIALLY_FILLED'] } });

        if (openOrders.length > 0) {
            // --- MODE CHECK: Only cancel on exchange if LIVE ---
            if (this.bot.mode === 'live') {
                await this.exchangeService.cancelMultipleOrders(this.bot, openOrders);
                this._log('info', `📡 Sent cancel request for ${openOrders.length} live orders.`);
            } else {
                this._log('info', `📝 Marked ${openOrders.length} paper orders as canceled.`);
            }

            await Order.updateMany(
                { botId: this.botId, status: { $in: ['OPEN', 'PARTIALLY_FILLED'] } },
                { status: 'CANCELED' }
            );
        }
    }

    // =========================================================================
    //  WATCHDOG & PAPER SIMULATION
    // =========================================================================

    async onTick() {
        if (!this.isRunning) return;

        // In Paper Mode, we must fetch the price ourselves to simulate fills
        if (this.bot.mode === 'paper') {
            try {
                // Fetch ticker to check against open orders
                const ticker = await this.exchangeService.getTicker(
                    this.bot.userId.toString(),
                    this.bot.symbol,
                    this.bot.accountType,
                    this.bot.accountId
                );

                await this.simulatePaperFills(ticker.last);
            } catch (err) {
                // Suppress ticker errors to avoid log spam
            }
        }
    }

    async simulatePaperFills(currentPrice) {
        const { v4: uuidv4 } = await import('uuid');

        const openOrders = await Order.find({
            botId: this.botId,
            status: 'OPEN'
        });

        for (const order of openOrders) {
            // Logic:
            // BUY Order: Filled if Price <= OrderPrice
            // SELL Order: Filled if Price >= OrderPrice

            let isFilled = false;
            if (order.side === 'BUY' && currentPrice <= order.price) {
                isFilled = true;
            } else if (order.side === 'SELL' && currentPrice >= order.price) {
                isFilled = true;
            }

            if (isFilled) {
                this._log('info', `📝 Paper Fill: ${order.side} @ ${order.price} (Market: ${currentPrice})`);

                // Trigger the standard fill processing logic with fake data
                await this.processFill({
                    tradeId: `sim-trade-${uuidv4()}`,
                    orderId: order.exchangeOrderId, // This matches the 'paper-...' ID
                    symbol: this.bot.symbol,
                    price: order.price, // Fill at limit price (conservative) or currentPrice? Usually limit.
                    quantity: order.quantity,
                    side: order.side.toLowerCase(),
                    fee: 0,
                    feeCurrency: 'USDT',
                    timestamp: Date.now()
                });
            }
        }
    }

    // =========================================================================
    //  CORE LOGIC
    // =========================================================================

    async processFill(fillData) {
        if (!this.isRunning) return;

        this._log('info', `⚡ Fill Detected: ${fillData.side} ${fillData.quantity} @ ${fillData.price}`, {
            orderId: fillData.orderId,
            tradeId: fillData.tradeId
        });

        const session = await mongoose.startSession();
        // Use a safe transaction wrapper or try/catch if standalone
        try {
            session.startTransaction();
        } catch (e) {
            // If standalone DB, proceed without transaction
        }

        try {
            const existingFill = await Fill.findOne({ botId: this.botId, exchangeTradeId: fillData.tradeId }).session(session);
            if (existingFill) {
                if(session.inTransaction()) await session.abortTransaction();
                return;
            }

            const parentOrder = await Order.findOne({ botId: this.botId, exchangeOrderId: fillData.orderId }).session(session);
            if (!parentOrder) {
                if(session.inTransaction()) await session.abortTransaction();
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

            // Update Bot Position (Futures)
            if (this.bot.marketType === 'FUTURES') {
                const posChange = parentOrder.side === 'BUY' ? fillData.quantity : -fillData.quantity;
                await GridBotModel.updateOne({ _id: this.botId }, { $inc: { positionContracts: posChange } }).session(session);
            }

            // --- PnL TRACKING (Approximate for Grid) ---
            // If we just SOLD, we likely realized profit from a lower BUY.
            if (parentOrder.side === 'SELL') {
                const gridStep = parentOrder.price * (this.bot.gridConfig.gridStepPercentage || 0.01); // fallback
                const approxProfit = gridStep * fillData.quantity;

                // Update balances
                const update = { $inc: { cumulativePnL: approxProfit } };
                if (this.bot.mode === 'paper') {
                    update.$inc.paperBalance = approxProfit;
                }
                await GridBotModel.updateOne({ _id: this.botId }, update).session(session);
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
                    this._log('warn', `⚠️ Grid Boundary Reached.`);
                }
            }

            if(session.inTransaction()) await session.commitTransaction();

            // Execute the reaction order (Live or Paper)
            if (childOrderToPlace) {
                await this._placeOrder(childOrderToPlace);
            }

        } catch (error) {
            console.error(`Error processing fill:`, error);
            if(session.inTransaction()) await session.abortTransaction();
            this._log('error', `ProcessFill Exception`, { error: error.message });
        } finally {
            session.endSession();
        }
    }

    // =========================================================================
    //  ORDER HELPERS
    // =========================================================================

    /**
     * Central execution method handling Live vs Paper logic
     */
    async _placeOrder(orderDoc) {
        try {
            // --- PAPER MODE ---
            if (this.bot.mode === 'paper') {
                const { v4: uuidv4 } = await import('uuid');
                const fakeId = `paper-${uuidv4()}`;

                orderDoc.exchangeOrderId = fakeId;
                orderDoc.status = 'OPEN';
                await orderDoc.save();

                this._log('info', `📝 Paper Order Placed: ${orderDoc.side} @ ${orderDoc.price}`);
                return;
            }

            // --- LIVE MODE ---
            this._log('info', `🚀 Placing Live Order: ${orderDoc.side} @ ${orderDoc.price}`);

            const result = await this.exchangeService.createLimitOrder(this.bot, orderDoc);

            orderDoc.exchangeOrderId = result.id;
            orderDoc.status = 'OPEN';
            await orderDoc.save();

            this._log('info', `✅ Live Order Open`, { exchangeId: result.id });

        } catch (err) {
            this._log('error', `❌ Failed to place order`, { error: err.message });
            orderDoc.status = 'FAILED_PLACEMENT';
            await orderDoc.save();
        }
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

        const quantityPerOrder = this._calculateOrderQuantity();
        if (isNaN(quantityPerOrder) || quantityPerOrder <= 0) {
            this._log('error', `❌ Invalid Quantity. Check investment.`);
            return;
        }

        const ordersToPlace = [];

        for (let i = 0; i < this.gridLines.length; i++) {
            const price = this.gridLines[i];
            let side = null;

            if (price < currentPrice) side = 'BUY';
            else if (price > currentPrice) side = 'SELL';

            if (!side || Math.abs(price - currentPrice) / currentPrice < 0.002) continue;
            if (this.bot.marketType === 'SPOT' && side === 'SELL') continue; // Don't sell if we don't have bags yet

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
            this._log('warn', `⚠️ No Seed Orders Generated.`);
            return;
        }

        this._log('info', `📦 Generated ${ordersToPlace.length} Initial Orders`);

        const createdOrders = await Order.insertMany(ordersToPlace);
        this._log('info', `🚀 Executing Batch (${this.bot.mode.toUpperCase()})...`);

        // Execute sequentially to avoid rate limits or flooding
        for (const order of createdOrders) {
            await this._placeOrder(order);
        }

        this._log('info', `✅ Seeding Complete`);
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
        this._log('info', `🧮 Grid Calculation Complete`, { lines: this.gridLines.length });
    }

    _calculateOrderQuantity() {
        const investment = this.bot.investment || this.bot.marketInfo?.tradeFund || 0;
        const { gridCount, lowerPrice, upperPrice } = this.bot.gridConfig;

        if (!investment || investment <= 0) return 0;
        const avgPrice = (lowerPrice + upperPrice) / 2;
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
