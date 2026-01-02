// services/botService/DcaStrategyService.js

const mongoose = require('mongoose');
const Decimal = require('decimal.js');

const DcaBot   = require('../../models/DcaBot');
const DcaOrder = require('../../models/DcaOrder');
const DcaFill  = require('../../models/DcaFill');

const ExchangeService = require('./ExchangeService');
const botLogger = require('../../../logs/botLogger'); // Import the detailed logger

class DcaStrategyService {
    /**
     * @param {string} botId The ID of the bot this service instance manages.
     */
    constructor(botId) {
        this.botId = botId;
        this.bot = null;
        this.exchange = null; // ccxt instance bound to the bot's user
        this.market = null;   // market meta (precision/limits)
    }

    // --- HELPER: Unified Bot Logging ---
    _log(level, message, meta = {}) {
        const logger = botLogger.getLogger(this.botId.toString());
        if (logger && logger[level]) {
            logger[level](message, meta);
        }
    }

    /**
     * Initializes the service: loads bot + user-bound exchange + market meta.
     */
    async initialize() {
        this.bot = await DcaBot.findById(this.botId).populate('userId');
        if (!this.bot) throw new Error(`DCA Bot with id ${this.botId} not found.`);

        this._log('info', `Initializing DCA Strategy for ${this.bot.name} (${this.bot.symbol})`);

        // 2. USE THE AUTO-LOGIN HELPER
        this.exchange = await ExchangeService._getExchange(
            this.bot.userId._id.toString(),
            this.bot.accountType,
            this.bot.accountId
        );

        if (!this.exchange) {
            throw new Error(`Failed to establish exchange connection for bot ${this.botId}`);
        }

        // 3. Load Markets
        await this.exchange.loadMarkets();
        const symbol = this.bot.symbol.replace('/', '') === this.exchange.markets[this.bot.symbol] ? this.bot.symbol : this.bot.symbol.replace('/', '');

        this.market = this.exchange.market(this.bot.symbol) || this.exchange.market(symbol);

        if (!this.market) {
            this._log('warn', `Market meta not found for ${this.bot.symbol}, defaulting precision.`);
        }

        this._log('info', 'DCA Strategy Service initialized.');
    }

    async start() {
        if (!this.bot) await this.initialize();

        // 1) If there’s no deal yet, kick off a new one
        if (!this.bot.activeDeal) {
            await this.startNewDeal();
        } else {
            // If a deal is already active, ensure exits exist (useful on process restart)
            try {
                this._log('info', 'Resuming active deal. Checking exit protection...');
                const session = await mongoose.startSession();
                await session.withTransaction(async () => {
                    await this.ensureExitProtection(session);
                });
                await session.endSession();
            } catch (e) {
                this._log('warn', 'ensureExitProtection on start() warned.', { error: e.message });
            }
        }

        // 2) Subscribe to trade fills
        if (typeof ExchangeService.subscribeOrderFills === 'function') {
            this._unsubFills = ExchangeService.subscribeOrderFills(this.bot.userId._id.toString(), this.bot.symbol, async (trade) => {
                try {
                    await this.processFill(trade);
                } catch (err) {
                    this._log('error', 'processFill from WS failed', { error: err.message });
                }
            });
            this._log('info', 'Subscribed to order fills via WebSocket.');
        } else {
            this._log('warn', 'No subscribeOrderFills available; ensure processFill is called elsewhere.');
        }

        // 3) Soft SL watchdog (every 3–5s)
        this._softSlTimer = setInterval(() => {
            this.softStopWatcher().catch(err =>
                this._log('error', 'softStopWatcher tick failed', { error: err.message })
            );
        }, 4000);

        this._log('info', 'DCA bot started (listeners + soft SL active).');
    }

    async stop() {
        try {
            if (this._softSlTimer) {
                clearInterval(this._softSlTimer);
                this._softSlTimer = null;
            }
            if (this._unsubFills && typeof this._unsubFills === 'function') {
                this._unsubFills();
                this._unsubFills = null;
            }
            this._log('info', 'DCA bot stopped (listeners cleared).');
        } catch (e) {
            this._log('warn', 'stop() cleanup warned.', { error: e.message });
        }
    }

    // -----------------------------------------------------------------------------
    // Deal lifecycle
    // -----------------------------------------------------------------------------

    async startNewDeal() {
        if (!this.bot) await this.initialize();
        if (this.bot.activeDeal) {
            this._log('warn', 'startNewDeal called but activeDeal is already true.');
            return;
        }

        const referencePrice = (await this.exchange.fetchTicker(this.bot.symbol)).last;
        this._log('info', `🚀 Starting New Deal. Ref Price: ${referencePrice}`);

        const session = await mongoose.startSession();
        const preparedOrderIds = [];

        try {
            await session.withTransaction(async () => {
                const baseOrderVolume = this.bot.baseOrderVolume;

                if (this.bot.direction === 'NEUTRAL') {
                    const deviation = (this.bot.neutralEntryDeviation || 0) / 100;
                    const longPrice  = referencePrice * (1 - deviation);
                    const shortPrice = referencePrice * (1 + deviation);

                    this._log('info', `Calculating NEUTRAL Entry`, { longPrice, shortPrice, deviation });

                    const longBase  = await this.prepareOrder(session, 'BASE', baseOrderVolume, longPrice,  'buy');
                    const shortBase = await this.prepareOrder(session, 'BASE', baseOrderVolume, shortPrice, 'sell');

                    preparedOrderIds.push(longBase.id, shortBase.id);
                } else {
                    const side = this.bot.direction === 'LONG' ? 'buy' : 'sell';
                    const price = this.bot.useMarketForEntry ? null : referencePrice;
                    this._log('info', `Calculating Directional Entry (${this.bot.direction})`, { price: price || 'MARKET' });

                    const entry = await this.prepareOrder(session, 'BASE', baseOrderVolume, price, side);
                    preparedOrderIds.push(entry.id);
                }

                // Reset deal state atomically.
                this.bot.activeDeal = true;
                this.bot.activeDirection = null;
                this.bot.averageEntryPrice = 0;
                this.bot.totalVolume = 0;
                this.bot.positionContracts = 0;

                await this.bot.save({ session });
            });

            this._log('info', 'Transaction Committed. Placing Orders...', { count: preparedOrderIds.length });

            for (const id of preparedOrderIds) {
                await this.executeOrder(id);
            }
        } catch (error) {
            this._log('error', 'Failed to start new deal.', { error: error.message, stack: error.stack });
            throw error;
        } finally {
            await session.endSession();
        }
    }

    // -----------------------------------------------------------------------------
    // Exchange events → fills
    // -----------------------------------------------------------------------------

    async processFill(trade) {
        if (!this.bot) await this.initialize();

        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                const order = await DcaOrder.findOne({
                    botId: this.botId,
                    exchangeOrderId: trade.orderId
                }).session(session);

                if (!order) {
                    // Reduce log spam for unknown orders
                    // this._log('warn', 'Fill received for unknown order', { tradeId: trade.id });
                    return;
                }

                this._log('info', `⚡ Fill Detected: ${order.type} ${order.side} ${trade.amount} @ ${trade.price}`);

                try {
                    const fillDoc = new DcaFill({
                        exchangeTradeId: trade.id,
                        botId: this.botId,
                        orderId: order._id,
                        price: trade.price,
                        qty: trade.amount
                    });
                    await fillDoc.save({ session });
                } catch (e) {
                    if ((e && e.message || '').includes('E11000')) {
                        // Duplicate ignored
                        return;
                    }
                    throw e;
                }

                if (order.status !== 'FILLED') {
                    order.status = 'FILLED';
                    await order.save({ session });
                }

                // 4) NEUTRAL OCO Logic
                const isBase = order.type === 'BASE';
                const isNeutral = this.bot.direction === 'NEUTRAL';
                const directionLocked = !!this.bot.activeDirection;

                if (isBase && isNeutral && !directionLocked) {
                    const lockedDirection = order.side === 'buy' ? 'LONG' : 'SHORT';
                    this.bot.activeDirection = lockedDirection;

                    this._log('info', `🔒 NEUTRAL Direction Locked: ${lockedDirection}`);

                    const oppositeSide = order.side === 'buy' ? 'sell' : 'buy';
                    const opposite = await DcaOrder.findOne({
                        botId: this.botId,
                        type: 'BASE',
                        side: oppositeSide,
                        status: { $in: ['OPEN', 'PENDING_PLACEMENT', 'PARTIALLY_FILLED'] }
                    }).session(session);

                    if (opposite) {
                        opposite.status = 'PENDING_CANCEL';
                        await opposite.save({ session });
                        session._oppositeToCancel = opposite._id;
                    }

                    await this.bot.save({ session });
                }

                // 5) Metrics: Update AEP (Average Entry Price)
                const isEntry = order.type === 'BASE' || order.type === 'SAFETY';
                if (isEntry) {
                    const curQty = new Decimal(this.bot.positionContracts || 0);
                    const fillQty = new Decimal(trade.amount || 0);
                    const oldAep  = new Decimal(this.bot.averageEntryPrice || 0);

                    const newQty  = curQty.plus(fillQty);
                    const newAep  = newQty.gt(0)
                        ? oldAep.mul(curQty).plus(new Decimal(trade.price).mul(fillQty)).div(newQty)
                        : oldAep;

                    this._log('info', `🧮 Recalculating AEP`, {
                        oldAep: oldAep.toNumber(),
                        fillPrice: trade.price,
                        newAep: newAep.toNumber(),
                        totalSize: newQty.toNumber()
                    });

                    this.bot.positionContracts   = Number(newQty.toNumber());
                    this.bot.totalVolume         = Number(new Decimal(this.bot.totalVolume || 0).plus(fillQty).toNumber());
                    this.bot.averageEntryPrice   = Number(newAep.toNumber());

                    await this.bot.save({ session });
                }

                // 6) After entry fills, refresh TP/SL
                if (isEntry) {
                    await this.ensureExitProtection(session);
                }

                // 7) Exit Filled
                if (order.type === 'TAKE_PROFIT' || order.type === 'STOP_LOSS') {
                    this._log('info', `💰 Deal Closed via ${order.type}`);
                    await this.closeDealCleanup(session);
                }
            });

            // --- Post-commit side-effects ---
            if (session._oppositeToCancel) {
                const opp = await DcaOrder.findById(session._oppositeToCancel);
                if (opp && opp.exchangeOrderId) {
                    await this.cancelOrder(opp);
                }
            }

            if (session._ordersToPlace?.length) {
                this._log('info', `Placing ${session._ordersToPlace.length} queued orders (TP/SL)...`);
                for (const id of session._ordersToPlace) {
                    try {
                        await this.executeOrder(id);
                    } catch (e) {
                        this._log('error', `Failed to place queued order`, { orderId: id, error: e.message });
                    }
                }
            }
        } catch (error) {
            this._log('error', 'processFill transaction failed', { error: error.message });
            throw error;
        } finally {
            await session.endSession();
        }
    }

    // -----------------------------------------------------------------------------
    // Order execution
    // -----------------------------------------------------------------------------

    async prepareOrder(session, type, volume, price, side) {
        const { v4: uuidv4 } = await import('uuid');
        const clientOrderId = uuidv4();
        const normSide = (side || '').toLowerCase();

        let qty;
        if (price) {
            qty = this.exchange.amountToPrecision(this.bot.symbol, volume / price);
            price = this.exchange.priceToPrecision(this.bot.symbol, price);
        } else {
            const currentPrice = (await this.exchange.fetchTicker(this.bot.symbol)).last;
            qty = this.exchange.amountToPrecision(this.bot.symbol, volume / currentPrice);
        }

        if (this.bot.marketType === 'FUTURES') {
            qty = parseFloat(qty) * this.bot.leverage;
            qty = this.exchange.amountToPrecision(this.bot.symbol, qty);
        }

        const order = new DcaOrder({
            botId: this.botId,
            type,
            side: normSide,
            price,
            qty: parseFloat(qty),
            clientOrderId,
            status: 'PENDING_PLACEMENT'
        });

        await order.save({ session });
        // this._log('info', `Prepared ${type} Order`, { side: normSide, qty: order.qty, price: price || 'MARKET' });
        return order;
    }

    async executeOrder(orderId) {
        const order = await DcaOrder.findById(orderId);
        if (!order || order.status !== 'PENDING_PLACEMENT') return;

        try {
            const side = order.side;
            const params = {};
            if (this.bot.marketType === 'FUTURES' && order.reduceOnly) {
                params.reduceOnly = true;
            }

            const amount = parseFloat(this.quantizeAmount(order.qty));

            this._log('info', `🚀 Executing ${order.type} Order`, {
                side,
                amount,
                price: order.price || 'MARKET'
            });

            // TAKE_PROFIT → limit at tp
            if (order.type === 'TAKE_PROFIT') {
                const price = parseFloat(this.quantizePrice(order.price));
                const exOrder = await this.exchange.createOrder(this.bot.symbol, 'limit', side, amount, price, params);
                order.exchangeOrderId = exOrder.id;
                order.status = 'OPEN';
                await order.save();
                this._log('info', `✅ TP Placed`, { exchangeId: exOrder.id, price });
                return;
            }

            // STOP_LOSS
            if (order.type === 'STOP_LOSS') {
                const stopPrice = parseFloat(this.quantizePrice(order.price));
                const slParams = { ...params, stopPrice };
                let exOrder;
                try {
                    exOrder = await this.exchange.createOrder(this.bot.symbol, 'market', side, amount, undefined, slParams);
                } catch (e) {
                    this._log('warn', `Native SL Failed, fallback to Soft SL`, { error: e.message });
                    throw e;
                }

                order.exchangeOrderId = exOrder.id;
                order.status = 'OPEN';
                await order.save();
                this._log('info', `✅ SL Placed`, { exchangeId: exOrder.id, stopPrice });
                return;
            }

            // BASE/SAFETY entries
            const orderType = order.price ? 'limit' : 'market';
            const price = order.price ? parseFloat(this.quantizePrice(order.price)) : undefined;

            const exOrder = await this.exchange.createOrder(this.bot.symbol, orderType, side, amount, price, params);

            order.exchangeOrderId = exOrder.id;
            order.status = 'OPEN';
            await order.save();
            this._log('info', `✅ Entry Placed`, { exchangeId: exOrder.id });

        } catch (err) {
            order.status = 'FAILED_PLACEMENT';
            await order.save();
            this._log('error', `❌ Execution Failed`, { orderId, error: err.message });
            throw err;
        }
    }

    async cancelOrder(order) {
        try {
            await this.exchange.cancelOrder(order.exchangeOrderId, this.bot.symbol);
            this._log('info', `Canceled Order`, { orderId: order._id });
        } catch (e) {
            // this._log('warn', `Cancel failed (benign)`, { orderId: order._id, error: e.message });
        } finally {
            order.status = 'CANCELED';
            await order.save();
        }
    }

    // -----------------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------------

    getEntryExitSides(direction) {
        if (direction === 'LONG')  return { entry: 'buy',  exit: 'sell'  };
        if (direction === 'SHORT') return { entry: 'sell', exit: 'buy'   };
        throw new Error('Invalid direction');
    }

    quantizePrice(p) { return this.exchange.priceToPrecision(this.bot.symbol, p); }
    quantizeAmount(a) { return this.exchange.amountToPrecision(this.bot.symbol, a); }

    computeExitTargets() {
        const aep = new Decimal(this.bot.averageEntryPrice || 0);
        if (aep.lte(0)) return { tp: null, sl: null };

        const tpPct = new Decimal(this.bot.takeProfitPercent || 0);
        const slPct = new Decimal(this.bot.stopLossPercent   || 0);

        if (this.bot.activeDirection === 'LONG') {
            const tp = this.bot.enableTakeProfit ? aep.mul(Decimal(1).plus(tpPct.div(100))) : null;
            const sl = this.bot.enableStopLoss   ? aep.mul(Decimal(1).minus(slPct.div(100))) : null;
            return { tp: tp && tp.toNumber(), sl: sl && sl.toNumber() };
        } else if (this.bot.activeDirection === 'SHORT') {
            const tp = this.bot.enableTakeProfit ? aep.mul(Decimal(1).minus(tpPct.div(100))) : null;
            const sl = this.bot.enableStopLoss   ? aep.mul(Decimal(1).plus(slPct.div(100))) : null;
            return { tp: tp && tp.toNumber(), sl: sl && sl.toNumber() };
        }
        return { tp: null, sl: null };
    }

    async ensureExitProtection(session = null) {
        if (!this.bot.activeDeal || !this.bot.activeDirection) return;

        const positionQty = new Decimal(this.bot.positionContracts || 0);
        if (positionQty.lte(0)) return;

        const { exit } = this.getEntryExitSides(this.bot.activeDirection);
        const { tp, sl } = this.computeExitTargets();

        this._log('info', `🛡️ Checking Exit Protection`, {
            AEP: this.bot.averageEntryPrice,
            TP_Target: tp || 'Disabled',
            SL_Target: sl || 'Disabled'
        });

        // 1) TAKE PROFIT
        if (tp) {
            const existingTp = await DcaOrder.findOne({
                botId: this.botId,
                type: 'TAKE_PROFIT',
                status: { $in: ['PENDING_PLACEMENT', 'OPEN', 'PARTIALLY_FILLED'] }
            }).session?.(session);

            const mustReplace = this.bot.trackTpWithAep || !existingTp;

            if (mustReplace && existingTp && existingTp.exchangeOrderId) {
                // this._log('info', `Replacing TP to adjust for new AEP`);
                try {
                    await this.exchange.cancelOrder(existingTp.exchangeOrderId, this.bot.symbol);
                } catch (_) {}
                existingTp.status = 'CANCELED';
                await existingTp.save({ session });
            }

            if (!existingTp || mustReplace) {
                const qty = this.quantizeAmount(positionQty.toNumber());
                const price = this.quantizePrice(tp);
                const tpDoc = new DcaOrder({
                    botId: this.botId,
                    type: 'TAKE_PROFIT',
                    side: exit,
                    price: parseFloat(price),
                    qty: parseFloat(qty),
                    reduceOnly: this.bot.marketType === 'FUTURES',
                    status: 'PENDING_PLACEMENT'
                });
                await tpDoc.save({ session });
                session && (session._ordersToPlace = [...(session._ordersToPlace || []), tpDoc._id]);
            }
        }

        // 2) STOP LOSS
        if (sl) {
            const existingSl = await DcaOrder.findOne({
                botId: this.botId,
                type: 'STOP_LOSS',
                status: { $in: ['PENDING_PLACEMENT', 'OPEN', 'PARTIALLY_FILLED'] }
            }).session?.(session);

            if (existingSl && existingSl.exchangeOrderId) {
                try {
                    await this.exchange.cancelOrder(existingSl.exchangeOrderId, this.bot.symbol);
                } catch (_) {}
                existingSl.status = 'CANCELED';
                await existingSl.save({ session });
            }

            const qty = this.quantizeAmount(positionQty.toNumber());
            const stopPrice = this.quantizePrice(sl);

            const slDoc = new DcaOrder({
                botId: this.botId,
                type: 'STOP_LOSS',
                side: exit,
                qty: parseFloat(qty),
                price: parseFloat(stopPrice),
                reduceOnly: this.bot.marketType === 'FUTURES',
                status: 'PENDING_PLACEMENT'
            });
            await slDoc.save({ session });
            session && (session._ordersToPlace = [...(session._ordersToPlace || []), slDoc._id]);
        }
    }

    async closeDealCleanup(session) {
        // Cancel all open orders for this bot
        const openOrders = await DcaOrder.find({
            botId: this.botId,
            status: { $in: ['PENDING_PLACEMENT', 'OPEN', 'PARTIALLY_FILLED'] }
        }).session(session);

        this._log('info', `🧹 Cleaning up ${openOrders.length} open orders...`);

        for (const order of openOrders) {
            if (order.exchangeOrderId) {
                try { await this.exchange.cancelOrder(order.exchangeOrderId, this.bot.symbol); }
                catch (e) { }
            }
            order.status = 'CANCELED';
            await order.save({ session });
        }

        // Reset bot
        this.bot.activeDeal = false;
        this.bot.activeDirection = null;
        this.bot.averageEntryPrice = 0;
        this.bot.totalVolume = 0;
        this.bot.positionContracts = 0;
        this.bot.completedDeals = (this.bot.completedDeals || 0) + 1;
        await this.bot.save({ session });

        this._log('info', `✅ Deal Cycle Complete. Total Deals: ${this.bot.completedDeals}`);
    }

    async softStopWatcher() {
        try {
            if (!this.bot) await this.initialize();
            if (!this.bot.activeDeal || !this.bot.activeDirection || !this.bot.enableStopLoss) return;

            const { sl } = this.computeExitTargets();
            if (!sl) return;

            const ticker = await this.exchange.fetchTicker(this.bot.symbol);
            const price = ticker.last;
            const isLong = this.bot.activeDirection === 'LONG';
            const triggerHit = isLong ? price <= sl : price >= sl;
            if (!triggerHit) return;

            const qtyNum = Number(this.bot.positionContracts || 0);
            if (qtyNum <= 0) return;

            const { exit } = this.getEntryExitSides(this.bot.activeDirection);
            const amount = parseFloat(this.quantizeAmount(qtyNum));

            this._log('warn', `🚨 Soft SL Triggered! Market Exiting...`, { price, slLevel: sl });

            await this.exchange.createOrder(this.bot.symbol, 'market', exit, amount, undefined, {
                ...(this.bot.marketType === 'FUTURES' ? { reduceOnly: true } : {})
            });

            const session = await mongoose.startSession();
            try {
                await session.withTransaction(async () => {
                    await this.closeDealCleanup(session);
                });
            } finally {
                await session.endSession();
            }
        } catch (e) {
            this._log('error', 'Soft SL Watcher failed', { error: e.message });
        }
    }
}

module.exports = DcaStrategyService;
