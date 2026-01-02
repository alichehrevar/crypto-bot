// app/services/botService/DcaStrategyService.js

const mongoose = require('mongoose');
const Decimal = require('decimal.js');

const DcaBot   = require('../../models/DcaBot');
const DcaOrder = require('../../models/DcaOrder');
const DcaFill  = require('../../models/DcaFill');

const ExchangeService = require('./ExchangeService');
const botLogger = require('../../../logs/botLogger'); // Hybrid Logger

class DcaStrategyService {
    constructor(botId) {
        this.botId = botId;
        this.bot = null;
        this.exchange = null;
        this.market = null;
        this.tradeSymbol = null;
    }

    _log(level, message, meta = {}) {
        const logger = botLogger.getLogger(this.botId.toString());
        if (logger && logger[level]) {
            logger[level](message, meta);
        }
    }

    /**
     * SAFE TRANSACTION WRAPPER
     * Handles MongoDB Standalone (No Replica Set) gracefully.
     */
    async _executeTransaction(workFunction) {
        const session = await mongoose.startSession();
        let transactionStarted = false;

        try {
            // Try to start a real transaction
            session.startTransaction();
            transactionStarted = true;

            // Execute the work
            await workFunction(session);

            // Commit if successful
            await session.commitTransaction();
        } catch (error) {
            // If transaction failed, abort
            if (transactionStarted) {
                await session.abortTransaction();
            }

            // CRITICAL FIX: If error is "Transaction numbers only allowed on replica set",
            // retry WITHOUT transaction (Standalone Mode Support)
            if (error.message.includes('Transaction numbers are only allowed on a replica set') ||
                error.message.includes('This MongoDB deployment does not support retryable writes')) {

                // this._log('warn', `⚠️ DB is Standalone. Retrying operation without transaction...`);
                await workFunction(null); // Pass null session to run normally
                return;
            }

            throw error;
        } finally {
            await session.endSession();
        }
    }

    async initialize() {
        this.bot = await DcaBot.findById(this.botId).populate('userId');
        if (!this.bot) throw new Error(`DCA Bot ${this.botId} not found.`);

        this._log('info', `🤖 Initializing DCA Bot: ${this.bot.name}`, { symbol: this.bot.symbol });

        try {
            this.exchange = await ExchangeService._getExchange(
                this.bot.userId._id.toString(),
                this.bot.accountType,
                this.bot.accountId
            );

            await this.exchange.loadMarkets();

            // Smart Symbol Resolution
            const raw = this.bot.symbol;
            if (this.exchange.markets[raw]) {
                this.tradeSymbol = raw;
            } else if (this.exchange.markets[`${raw}/USDT`]) {
                this.tradeSymbol = `${raw}/USDT`;
            } else if (this.exchange.markets[`${raw}-USDT`]) {
                this.tradeSymbol = `${raw}-USDT`;
            } else if (this.exchange.markets[`${raw}USDT`]) {
                this.tradeSymbol = `${raw}USDT`;
            } else {
                const found = Object.keys(this.exchange.markets).find(m => m.startsWith(raw + '/') || m.startsWith(raw + '-'));
                if (found) {
                    this.tradeSymbol = found;
                } else {
                    throw new Error(`Market pair not found for "${raw}". Try "BTC-USDT".`);
                }
            }

            this.market = this.exchange.market(this.tradeSymbol);
            this._log('info', `✅ Market Connected`, { resolvedSymbol: this.tradeSymbol });

        } catch (error) {
            this._log('error', `❌ Initialization Failed: ${error.message}`, { stack: error.stack });
            throw error;
        }
    }

    async start() {
        try {
            if (!this.bot) await this.initialize();

            this.bot.status = 'RUNNING';
            await this.bot.save();

            if (!this.bot.activeDeal) {
                await this.startNewDeal();
            } else {
                this._log('info', `♻️ Resuming Active Deal`, {
                    pnl: this.bot.cumulativePnL,
                    pos: this.bot.positionContracts
                });

                await this._executeTransaction(async (session) => {
                    await this.ensureExitProtection(session);
                });
            }

            if (typeof ExchangeService.subscribeOrderFills === 'function') {
                this._unsubFills = ExchangeService.subscribeOrderFills(
                    this.bot.userId._id.toString(),
                    this.tradeSymbol,
                    async (trade) => {
                        try { await this.processFill(trade); }
                        catch (err) { this._log('error', 'WS Error', { error: err.message }); }
                    }
                );
                this._log('info', `📡 Listening for Trade Fills...`);
            } else {
                this._log('warn', `⚠️ WebSocket unavailable. Manual polling required.`);
            }

            this._softSlTimer = setInterval(() => {
                this.softStopWatcher().catch(err =>
                    this._log('error', 'Soft SL Watcher Error', { error: err.message })
                );
            }, 4000);

            this._log('info', `DCA Bot Started (Running)`);

        } catch (error) {
            this._log('error', `❌ Failed to Start DCA Bot`, { error: error.message });
            throw error;
        }
    }

    async stop() {
        if (this._softSlTimer) {
            clearInterval(this._softSlTimer);
            this._softSlTimer = null;
        }
        if (this._unsubFills) {
            this._unsubFills();
            this._unsubFills = null;
        }
        this.bot.status = 'STOPPED';
        await this.bot.save();
        this._log('warn', `⏹️ DCA Bot Stopped.`);
    }

    // -----------------------------------------------------------------------------
    // Deal Logic
    // -----------------------------------------------------------------------------

    async startNewDeal() {
        if (!this.bot) await this.initialize();
        if (this.bot.activeDeal) return;

        const ticker = await this.exchange.fetchTicker(this.tradeSymbol);
        const refPrice = ticker.last;

        this._log('info', `🚀 Starting New Deal`, {
            price: refPrice,
            direction: this.bot.direction
        });

        const preparedOrderIds = [];

        try {
            // FIX: Use _executeTransaction instead of session.withTransaction
            await this._executeTransaction(async (session) => {
                const baseVol = this.bot.baseOrderVolume;

                if (this.bot.direction === 'NEUTRAL') {
                    const deviation = (this.bot.neutralEntryDeviation || 0) / 100;
                    const longPrice  = refPrice * (1 - deviation);
                    const shortPrice = refPrice * (1 + deviation);

                    const longBase  = await this.prepareOrder(session, 'BASE', baseVol, longPrice,  'BUY');
                    const shortBase = await this.prepareOrder(session, 'BASE', baseVol, shortPrice, 'SELL');
                    preparedOrderIds.push(longBase.id, shortBase.id);
                } else {
                    const side = this.bot.direction === 'LONG' ? 'BUY' : 'SELL';
                    const price = this.bot.useMarketForEntry ? null : refPrice;
                    const entry = await this.prepareOrder(session, 'BASE', baseVol, price, side);
                    preparedOrderIds.push(entry.id);
                }

                this.bot.activeDeal = true;
                this.bot.activeDirection = null;
                this.bot.averageEntryPrice = 0;
                this.bot.totalVolume = 0;
                this.bot.positionContracts = 0;
                await this.bot.save({ session });
            });

            this._log('info', `📤 Placing ${preparedOrderIds.length} Entry Orders...`);

            for (const id of preparedOrderIds) {
                await this.executeOrder(id);
            }
        } catch (error) {
            this._log('error', `❌ Start Deal Failed`, { error: error.message });
            throw error;
        }
    }

    // -----------------------------------------------------------------------------
    // Fills
    // -----------------------------------------------------------------------------

    async processFill(trade) {
        if (!this.bot) await this.initialize();
        this._log('info', `⚡ Fill Detected: ${trade.side} ${trade.amount} @ ${trade.price}`);

        let sessionOrdersToPlace = [];
        let sessionCancelId = null;

        try {
            // FIX: Use _executeTransaction
            await this._executeTransaction(async (session) => {
                const order = await DcaOrder.findOne({ botId: this.botId, exchangeOrderId: trade.orderId }).session(session);
                if (!order) return;

                try {
                    await new DcaFill({
                        exchangeTradeId: trade.id,
                        botId: this.botId,
                        orderId: order._id,
                        price: trade.price,
                        qty: trade.amount
                    }).save({ session });
                } catch (e) {
                    if (e.message.includes('E11000')) return;
                    throw e;
                }

                order.status = 'FILLED';
                await order.save({ session });

                // 4) NEUTRAL OCO Logic
                const isBase = order.type === 'BASE';
                const isNeutral = this.bot.direction === 'NEUTRAL';

                if (isBase && isNeutral && !this.bot.activeDirection) {
                    const lockedDir = order.side === 'BUY' ? 'LONG' : 'SHORT';
                    this.bot.activeDirection = lockedDir;
                    this._log('info', `🔒 Direction Locked: ${lockedDir}`);

                    // Cancel Opposite
                    const oppSide = order.side === 'BUY' ? 'SELL' : 'BUY';
                    const opposite = await DcaOrder.findOne({ botId: this.botId, type: 'BASE', side: oppSide, status: 'OPEN' }).session(session);
                    if (opposite) {
                        opposite.status = 'PENDING_CANCEL';
                        await opposite.save({ session });
                        sessionCancelId = opposite._id;
                    }
                    await this.bot.save({ session });
                }

                // 5) Metrics & AEP
                const isEntry = order.type === 'BASE' || order.type === 'SAFETY';
                if (isEntry) {
                    const curQty = new Decimal(this.bot.positionContracts || 0);
                    const fillQty = new Decimal(trade.amount || 0);
                    const oldAep  = new Decimal(this.bot.averageEntryPrice || 0);

                    const newQty  = curQty.plus(fillQty);
                    const newAep  = newQty.gt(0)
                        ? oldAep.mul(curQty).plus(new Decimal(trade.price).mul(fillQty)).div(newQty)
                        : oldAep;

                    this.bot.positionContracts = Number(newQty.toNumber());
                    this.bot.totalVolume       = Number(new Decimal(this.bot.totalVolume || 0).plus(fillQty).toNumber());
                    this.bot.averageEntryPrice = Number(newAep.toNumber());

                    await this.bot.save({ session });

                    this._log('info', `🧮 AEP Updated`, {
                        newAep: this.bot.averageEntryPrice,
                        totalSize: this.bot.positionContracts
                    });
                }

                // 6) Refresh TP/SL
                if (isEntry) {
                    await this.ensureExitProtection(session, (id) => sessionOrdersToPlace.push(id));
                }

                // 7) Exit Filled?
                if (order.type === 'TAKE_PROFIT' || order.type === 'STOP_LOSS') {
                    this._log('info', `💰 Deal Closed via ${order.type}`);
                    await this.closeDealCleanup(session);
                }
            });

            // Post-Commit
            if (sessionCancelId) {
                const opp = await DcaOrder.findById(sessionCancelId);
                if (opp) await this.cancelOrder(opp);
            }
            if (sessionOrdersToPlace.length > 0) {
                this._log('info', `🛡️ Placing Exit Orders...`);
                for (const id of sessionOrdersToPlace) {
                    await this.executeOrder(id);
                }
            }

        } catch (error) {
            this._log('error', `ProcessFill Failed`, { error: error.message });
        }
    }

    // -----------------------------------------------------------------------------
    // Order Helpers
    // -----------------------------------------------------------------------------

    async prepareOrder(session, type, volume, price, side) {
        const { v4: uuidv4 } = await import('uuid');
        const symbol = this.tradeSymbol;

        let qty;
        if (price) {
            qty = this.exchange.amountToPrecision(symbol, volume / price);
            price = this.exchange.priceToPrecision(symbol, price);
        } else {
            const currentPrice = (await this.exchange.fetchTicker(symbol)).last;
            qty = this.exchange.amountToPrecision(symbol, volume / currentPrice);
        }

        if (this.bot.marketType === 'FUTURES') {
            qty = parseFloat(qty) * this.bot.leverage;
        }

        const order = new DcaOrder({
            botId: this.botId,
            type,
            side: (side || '').toUpperCase(),
            price,
            qty: parseFloat(qty),
            clientOrderId: uuidv4(),
            status: 'PENDING_PLACEMENT'
        });

        await order.save({ session });
        return order;
    }

    async executeOrder(orderId) {
        const order = await DcaOrder.findById(orderId);
        if (!order || order.status !== 'PENDING_PLACEMENT') return;

        try {
            const side = order.side.toLowerCase();
            const params = this.bot.marketType === 'FUTURES' && order.reduceOnly ? { reduceOnly: true } : {};
            const amount = parseFloat(order.qty);

            this._log('info', `🚀 Executing ${order.type}`, { side, amount, price: order.price || 'MARKET' });

            let exOrder;
            if (order.type === 'TAKE_PROFIT') {
                exOrder = await this.exchange.createOrder(this.tradeSymbol, 'limit', side, amount, order.price, params);
            } else if (order.type === 'STOP_LOSS') {
                exOrder = await this.exchange.createOrder(this.tradeSymbol, 'market', side, amount, undefined, { ...params, stopPrice: order.price });
            } else {
                const type = order.price ? 'limit' : 'market';
                exOrder = await this.exchange.createOrder(this.tradeSymbol, type, side, amount, order.price, params);
            }

            order.exchangeOrderId = exOrder.id;
            order.status = 'OPEN';
            await order.save();
            this._log('info', `✅ Order Placed`, { exchangeId: exOrder.id });

        } catch (err) {
            order.status = 'FAILED_PLACEMENT';
            await order.save();
            this._log('error', `❌ Execution Failed`, { orderId: order._id, reason: err.message });
        }
    }

    async cancelOrder(order) {
        try {
            if (order.exchangeOrderId) await this.exchange.cancelOrder(order.exchangeOrderId, this.tradeSymbol);
            order.status = 'CANCELED';
            await order.save();
            this._log('info', `🚫 Order Canceled`, { id: order._id });
        } catch (e) {
            this._log('warn', `Cancel Failed`, { error: e.message });
        }
    }

    // -----------------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------------

    getEntryExitSides(direction) {
        if (direction === 'LONG')  return { entry: 'BUY',  exit: 'SELL'  };
        if (direction === 'SHORT') return { entry: 'SELL', exit: 'BUY'   };
        throw new Error(`Invalid direction: ${direction}`);
    }

    quantizePrice(p) { return this.exchange.priceToPrecision(this.tradeSymbol, p); }
    quantizeAmount(a) { return this.exchange.amountToPrecision(this.tradeSymbol, a); }

    computeExitTargets() {
        const aep = new Decimal(this.bot.averageEntryPrice || 0);
        if (aep.lte(0)) return { tp: null, sl: null };

        const tpPct = new Decimal(this.bot.takeProfitPercent || 0);
        const slPct = new Decimal(this.bot.stopLossPercent   || 0);

        if (this.bot.activeDirection === 'LONG') {
            const tp = this.bot.enableTakeProfit ? aep.mul(Decimal(1).plus(tpPct.div(100))) : null;
            const sl = this.bot.enableStopLoss   ? aep.mul(Decimal(1).minus(slPct.div(100))) : null;
            return { tp: tp?.toNumber(), sl: sl?.toNumber() };
        } else if (this.bot.activeDirection === 'SHORT') {
            const tp = this.bot.enableTakeProfit ? aep.mul(Decimal(1).minus(tpPct.div(100))) : null;
            const sl = this.bot.enableStopLoss   ? aep.mul(Decimal(1).plus(slPct.div(100))) : null;
            return { tp: tp?.toNumber(), sl: sl?.toNumber() };
        }
        return { tp: null, sl: null };
    }

    // Updated to accept a callback for adding orders to the parent list
    async ensureExitProtection(session = null, addOrderCallback = null) {
        if (!this.bot.activeDeal || !this.bot.activeDirection) return;

        const { tp, sl } = this.computeExitTargets();
        const { exit } = this.getEntryExitSides(this.bot.activeDirection);
        const qty = this.bot.positionContracts;

        if (tp) {
            const tpDoc = new DcaOrder({
                botId: this.botId,
                type: 'TAKE_PROFIT',
                side: exit,
                price: parseFloat(this.quantizePrice(tp)),
                qty: parseFloat(this.quantizeAmount(qty)),
                reduceOnly: this.bot.marketType === 'FUTURES',
                status: 'PENDING_PLACEMENT'
            });
            await tpDoc.save({ session });
            if (addOrderCallback) addOrderCallback(tpDoc._id);
        }

        if (sl) {
            const slDoc = new DcaOrder({
                botId: this.botId,
                type: 'STOP_LOSS',
                side: exit,
                price: parseFloat(this.quantizePrice(sl)),
                qty: parseFloat(this.quantizeAmount(qty)),
                reduceOnly: this.bot.marketType === 'FUTURES',
                status: 'PENDING_PLACEMENT'
            });
            await slDoc.save({ session });
            if (addOrderCallback) addOrderCallback(slDoc._id);
        }
    }

    async closeDealCleanup(session) {
        const openOrders = await DcaOrder.find({
            botId: this.botId,
            status: { $in: ['PENDING_PLACEMENT', 'OPEN', 'PARTIALLY_FILLED'] }
        }).session(session);

        for (const o of openOrders) {
            if (o.exchangeOrderId) {
                try { await this.exchange.cancelOrder(o.exchangeOrderId, this.tradeSymbol); } catch (_) {}
            }
            o.status = 'CANCELED';
            await o.save({ session });
        }

        this.bot.activeDeal = false;
        this.bot.activeDirection = null;
        this.bot.completedDeals = (this.bot.completedDeals || 0) + 1;
        await this.bot.save({ session });

        this._log('info', `🏁 Deal Cycle Ended. Total Deals: ${this.bot.completedDeals}`);
    }

    async softStopWatcher() {
        try {
            if (!this.bot) await this.initialize();
            if (!this.bot.activeDeal || !this.bot.activeDirection || !this.bot.enableStopLoss) return;

            const { sl } = this.computeExitTargets();
            if (!sl) return;

            const ticker = await this.exchange.fetchTicker(this.tradeSymbol);
            const price = ticker.last;
            const isLong = this.bot.activeDirection === 'LONG';

            if ((isLong && price <= sl) || (!isLong && price >= sl)) {
                this._log('warn', `🚨 Soft SL Triggered!`, { price, sl });

                const { exit } = this.getEntryExitSides(this.bot.activeDirection);
                const amount = parseFloat(this.quantizeAmount(this.bot.positionContracts));

                await this.exchange.createOrder(this.tradeSymbol, 'market', exit.toLowerCase(), amount, undefined, {
                    ...(this.bot.marketType === 'FUTURES' ? { reduceOnly: true } : {})
                });

                await this._executeTransaction(async (session) => {
                    await this.closeDealCleanup(session);
                });
            }
        } catch (e) {
            this._log('error', 'Soft SL Error', { error: e.message });
        }
    }
}

module.exports = DcaStrategyService;
