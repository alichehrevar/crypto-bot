// services/botService/DcaStrategyService.js
// -----------------------------------------------------------------------------
// DCA strategy core service for a single bot instance.
// - Initializes user-specific ccxt exchange
// - Starts new deals (NEUTRAL two-sided OCO or directional)
// - Records fills idempotently (DcaFill)
// - Locks direction on first BASE fill in NEUTRAL (and cancels opposite BASE)
// - Maintains metrics (AEP / totalVolume / positionContracts)
// - Ensures and maintains TP/SL (native) and Soft SL fallback
// - Closes deal cleanly on TP/SL fill (cancels siblings/entries, resets state)
// -----------------------------------------------------------------------------

const mongoose = require('mongoose');
const Decimal = require('decimal.js');

const DcaBot   = require('../../models/DcaBot');
const DcaOrder = require('../../models/DcaOrder');
const DcaFill  = require('../../models/DcaFill');

const ExchangeService = require('./ExchangeService'); // user-scoped ccxt instances
const logger = require('../../../logs/logger');

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

    /**
     * Initializes the service: loads bot + user-bound exchange + market meta.
     */
    async initialize() {
        this.bot = await DcaBot.findById(this.botId).populate('userId');
        if (!this.bot) throw new Error(`DCA Bot with id ${this.botId} not found.`);
        if (!this.bot.userId) throw new Error(`Bot ${this.botId} is not associated with a user.`);

        // Pull the active ccxt client for the user from ExchangeService.
        this.exchange = ExchangeService.exchanges.get(this.bot.userId._id.toString());
        if (!this.exchange) {
            throw new Error(`No active exchange connection for user ${this.bot.userId._id}`);
        }

        // Load markets and cache the symbol’s meta.
        await this.exchange.loadMarkets();
        this.market = this.exchange.market(this.bot.symbol);
        if (!this.market) throw new Error(`Symbol ${this.bot.symbol} not found on exchange ${this.exchange.id}`);

        logger.info({ botId: this.botId, exchange: this.exchange.id, symbol: this.bot.symbol }, 'DCA Strategy Service initialized.');
    }

    async start() {
        if (!this.bot) await this.initialize();

        // 1) If there’s no deal yet, kick off a new one
        if (!this.bot.activeDeal) {
            await this.startNewDeal();
        } else {
            // If a deal is already active, ensure exits exist (useful on process restart)
            try {
                const session = await mongoose.startSession();
                await session.withTransaction(async () => {
                    await this.ensureExitProtection(session);
                });
                await session.endSession();
            } catch (e) {
                logger.warn({ botId: this.botId, err: e.message }, 'ensureExitProtection on start() warned.');
            }
        }

        // 2) Subscribe to trade fills for this symbol (via your ExchangeService, or ccxt stream)
        // Pseudo API: adapt to how you emit trades in ExchangeService (WS/polling)
        if (typeof ExchangeService.subscribeOrderFills === 'function') {
            this._unsubFills = ExchangeService.subscribeOrderFills(this.bot.userId._id.toString(), this.bot.symbol, async (trade) => {
                try {
                    await this.processFill(trade);
                } catch (err) {
                    logger.error({ botId: this.botId, err: err.message }, 'processFill from WS failed');
                }
            });
            logger.info({ botId: this.botId }, 'Subscribed to order fills.');
        } else {
            logger.warn({ botId: this.botId }, 'No subscribeOrderFills available; ensure processFill is called elsewhere.');
        }

        // 3) Soft SL watchdog (every 3–5s)
        this._softSlTimer = setInterval(() => {
            this.softStopWatcher().catch(err =>
                logger.error({ botId: this.botId, err: err.message }, 'softStopWatcher tick failed')
            );
        }, 4000);

        logger.info({ botId: this.botId }, 'DCA bot started (listeners + soft SL active).');
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
            logger.info({ botId: this.botId }, 'DCA bot stopped (listeners cleared).');
        } catch (e) {
            logger.warn({ botId: this.botId, err: e.message }, 'stop() cleanup warned.');
        }
    }

    // -----------------------------------------------------------------------------
    // Deal lifecycle
    // -----------------------------------------------------------------------------

    /**
     * Prepares and executes the initial entry orders to start a new trading cycle.
     * - NEUTRAL: place two BASE limit orders around reference price (OCO behavior)
     * - Directional: single BASE (limit near ref or market if configured)
     * Uses a DB transaction to create orders + set activeDeal atomically.
     */
    async startNewDeal() {
        if (!this.bot) await this.initialize();
        if (this.bot.activeDeal) {
            logger.warn({ botId: this.botId }, 'startNewDeal called but activeDeal is already true.');
            return;
        }

        logger.info({ botId: this.botId }, 'Starting new DCA deal cycle.');
        const referencePrice = (await this.exchange.fetchTicker(this.bot.symbol)).last;

        const session = await mongoose.startSession();
        const preparedOrderIds = [];

        try {
            await session.withTransaction(async () => {
                const baseOrderVolume = this.bot.baseOrderVolume;

                if (this.bot.direction === 'NEUTRAL') {
                    // Two-sided NEUTRAL entry (like OCO):
                    const deviation = (this.bot.neutralEntryDeviation || 0) / 100;
                    const longPrice  = referencePrice * (1 - deviation); // BUY below ref
                    const shortPrice = referencePrice * (1 + deviation); // SELL above ref

                    const longBase  = await this.prepareOrder(session, 'BASE', baseOrderVolume, longPrice,  'buy');
                    const shortBase = await this.prepareOrder(session, 'BASE', baseOrderVolume, shortPrice, 'sell');

                    preparedOrderIds.push(longBase.id, shortBase.id);
                    logger.info({ botId: this.botId, orders: preparedOrderIds }, 'Prepared NEUTRAL entry orders.');
                } else {
                    // Directional entry:
                    const side = this.bot.direction === 'LONG' ? 'buy' : 'sell';
                    const price = this.bot.useMarketForEntry ? null : referencePrice;
                    const entry = await this.prepareOrder(session, 'BASE', baseOrderVolume, price, side);
                    preparedOrderIds.push(entry.id);
                    logger.info({ botId: this.botId, orders: preparedOrderIds }, 'Prepared directional entry order.');
                }

                // Reset deal state atomically.
                this.bot.activeDeal = true;
                this.bot.activeDirection = null; // will be locked on first fill if NEUTRAL
                this.bot.averageEntryPrice = 0;
                this.bot.totalVolume = 0;
                this.bot.positionContracts = 0;

                await this.bot.save({ session });
            });

            logger.info({ botId: this.botId, count: preparedOrderIds.length }, 'New deal transaction committed. Placing entry orders...');

            // After commit, place the orders on the exchange (side-effect).
            for (const id of preparedOrderIds) {
                await this.executeOrder(id);
            }
        } catch (error) {
            logger.error({ botId: this.botId, error: error.message, stack: error.stack }, 'Failed to start new deal.');
            throw error;
        } finally {
            await session.endSession();
        }
    }

    // -----------------------------------------------------------------------------
    // Exchange events → fills
    // -----------------------------------------------------------------------------

    /**
     * Processes a trade fill payload (from ccxt WS/polling, shape may vary).
     * Responsibilities:
     * - find the DcaOrder by exchangeOrderId
     * - record fill idempotently (DcaFill, unique on trade.id)
     * - if NEUTRAL and first BASE fills, lock direction and cancel opposite BASE
     * - update metrics (AEP, totalVolume, positionContracts)
     * - ensure TP/SL exist or are updated (after entry fills)
     * - if TP/SL filled, close the deal (cancel siblings/entries, reset bot)
     */
    async processFill(trade) {
        if (!this.bot) await this.initialize();
        logger.info({ botId: this.botId, trade }, 'Processing fill.');

        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                // 1) Locate the order using exchangeOrderId
                const order = await DcaOrder.findOne({
                    botId: this.botId,
                    exchangeOrderId: trade.orderId
                }).session(session);

                if (!order) {
                    logger.warn({ botId: this.botId, tradeId: trade.id, orderId: trade.orderId }, 'Fill received for unknown order. Ignoring.');
                    return;
                }

                // 2) Idempotent fill recording (unique by exchangeTradeId)
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
                        logger.info({ botId: this.botId, tradeId: trade.id }, 'Duplicate fill ignored (already processed).');
                        return;
                    }
                    throw e;
                }

                // 3) Mark order as FILLED (simplified; could be PARTIALLY_FILLED if needed)
                if (order.status !== 'FILLED') {
                    order.status = 'FILLED';
                    await order.save({ session });
                }

                // 4) NEUTRAL OCO: lock direction on first BASE fill and cancel the opposite BASE
                const isBase = order.type === 'BASE';
                const isNeutral = this.bot.direction === 'NEUTRAL';
                const directionLocked = !!this.bot.activeDirection;

                if (isBase && isNeutral && !directionLocked) {
                    // Side in DB is normalized to lowercase
                    const lockedDirection = order.side === 'buy' ? 'LONG' : 'SHORT';
                    this.bot.activeDirection = lockedDirection;

                    // Cancel the other BASE side, if still open/pending.
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
                        // Defer exchange cancel until after commit (side-effect):
                        session._oppositeToCancel = opposite._id;
                    }

                    await this.bot.save({ session });
                    logger.info({ botId: this.botId, lockedDirection }, 'Direction locked after first BASE fill (NEUTRAL).');
                }

                // 5) Metrics: update AEP / volume / contracts for ENTRY types (BASE or SAFETY)
                const isEntry = order.type === 'BASE' || order.type === 'SAFETY';
                if (isEntry) {
                    const curQty = new Decimal(this.bot.positionContracts || 0);
                    const fillQty = new Decimal(trade.amount || 0);
                    const aep     = new Decimal(this.bot.averageEntryPrice || 0);

                    const newQty  = curQty.plus(fillQty);
                    const newAep  = newQty.gt(0)
                        ? aep.mul(curQty).plus(new Decimal(trade.price).mul(fillQty)).div(newQty)
                        : aep;

                    this.bot.positionContracts   = Number(newQty.toNumber());
                    this.bot.totalVolume         = Number(new Decimal(this.bot.totalVolume || 0).plus(fillQty).toNumber());
                    this.bot.averageEntryPrice   = Number(newAep.toNumber());

                    await this.bot.save({ session });
                    logger.info({
                        botId: this.botId,
                        positionContracts: this.bot.positionContracts,
                        averageEntryPrice: this.bot.averageEntryPrice,
                        totalVolume: this.bot.totalVolume
                    }, 'Updated metrics after ENTRY fill.');
                }

                // 6) After entry fills, place/refresh exit protection (TP/SL)
                if (isEntry) {
                    await this.ensureExitProtection(session); // queues orders to place after commit
                }

                // 7) If an EXIT filled (TP/SL), close the deal cleanly
                if (order.type === 'TAKE_PROFIT' || order.type === 'STOP_LOSS') {
                    await this.closeDealCleanup(session);
                    logger.info({ botId: this.botId, exitType: order.type }, 'Exit filled → deal closed.');
                }
            });

            // --- Post-commit side-effects ---
            // Cancel opposite BASE after commit (if any)
            if (session._oppositeToCancel) {
                const opp = await DcaOrder.findById(session._oppositeToCancel);
                if (opp && opp.exchangeOrderId) {
                    await this.cancelOrder(opp); // updates to CANCELED
                    logger.info({ botId: this.botId, orderId: opp._id }, 'Opposite BASE canceled post-commit.');
                }
            }

            // Place queued TP/SL (or others) after commit
            if (session._ordersToPlace?.length) {
                for (const id of session._ordersToPlace) {
                    try {
                        await this.executeOrder(id);
                    } catch (e) {
                        logger.error({ botId: this.botId, orderId: id, err: e.message }, 'Failed to place queued order after commit.');
                    }
                }
            }
        } catch (error) {
            logger.error({ botId: this.botId, error: error.message, stack: error.stack }, 'processFill failed.');
            throw error;
        } finally {
            await session.endSession();
        }
    }

    // -----------------------------------------------------------------------------
    // Order creation / execution / cancellation
    // -----------------------------------------------------------------------------

    /**
     * Creates an order doc within a txn; does not place it on the exchange.
     * @param {ClientSession} session
     * @param {'BASE'|'SAFETY'|'TAKE_PROFIT'|'STOP_LOSS'} type
     * @param {number} volume - quote volume budget (USDT etc.) for entry; for exits we will set qty directly
     * @param {number|null} price - limit price (null => market)
     * @param {'buy'|'sell'} side
     */
    async prepareOrder(session, type, volume, price, side) {
        const { v4: uuidv4 } = await import('uuid');
        const clientOrderId = uuidv4();

        // Normalize side to lowercase for consistency everywhere.
        const normSide = (side || '').toLowerCase();

        // Determine quantity with exchange precision (for entries).
        // For limit: qty = volume / price; for market: use current price
        let qty;
        if (price) {
            qty = this.exchange.amountToPrecision(this.bot.symbol, volume / price);
            price = this.exchange.priceToPrecision(this.bot.symbol, price);
        } else {
            const currentPrice = (await this.exchange.fetchTicker(this.bot.symbol)).last;
            qty = this.exchange.amountToPrecision(this.bot.symbol, volume / currentPrice);
        }

        // Apply leverage for futures positions (qty scales by leverage).
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
        logger.info({ botId: this.botId, orderId: order.id, type, side: normSide, price, qty: order.qty }, 'Prepared order doc.');
        return order;
    }

    /**
     * Places a prepared order on the exchange; updates order with exchangeOrderId + status.
     * Supports BASE/SAFETY (limit/market), TAKE_PROFIT (limit), STOP_LOSS (stop-market style).
     */
    async executeOrder(orderId) {
        const order = await DcaOrder.findById(orderId);
        if (!order || order.status !== 'PENDING_PLACEMENT') {
            logger.warn({ orderId }, 'Execute called on an invalid or already processed order.');
            return;
        }

        try {
            const side = order.side; // lowercase
            const params = {};
            if (this.bot.marketType === 'FUTURES' && order.reduceOnly) {
                params.reduceOnly = true;
            }

            const amount = parseFloat(this.quantizeAmount(order.qty));

            // TAKE_PROFIT → limit at tp
            if (order.type === 'TAKE_PROFIT') {
                const price = parseFloat(this.quantizePrice(order.price));
                logger.info({ botId: this.botId, orderId, type: order.type, side, amount, price }, 'Placing TAKE_PROFIT limit order...');
                const exOrder = await this.exchange.createOrder(
                    this.bot.symbol,
                    'limit',
                    side,
                    amount,
                    price,
                    params
                );
                order.exchangeOrderId = exOrder.id;
                order.status = 'OPEN';
                await order.save();
                logger.info({ botId: this.botId, orderId: order.id, exchangeOrderId: exOrder.id }, 'TAKE_PROFIT placed.');
                return;
            }

            // STOP_LOSS → try stop-market (params.stopPrice). Mapping may vary by exchange.
            if (order.type === 'STOP_LOSS') {
                const stopPrice = parseFloat(this.quantizePrice(order.price)); // stored as trigger
                const slParams = { ...params, stopPrice };
                logger.info({ botId: this.botId, orderId, type: order.type, side, amount, stopPrice }, 'Placing STOP_LOSS (stop-market) ...');

                let exOrder;
                try {
                    // default attempt: 'market' + stopPrice param (supported on many ccxt ids)
                    exOrder = await this.exchange.createOrder(this.bot.symbol, 'market', side, amount, undefined, slParams);
                } catch (e) {
                    // If your exchange needs special params (e.g., Binance/OKX), adapt in ExchangeService.
                    logger.warn({ botId: this.botId, orderId, err: e.message }, 'Native stop failed. Consider Soft SL or exchange-specific mapping.');
                    throw e;
                }

                order.exchangeOrderId = exOrder.id;
                order.status = 'OPEN';
                await order.save();
                logger.info({ botId: this.botId, orderId: order.id, exchangeOrderId: exOrder.id }, 'STOP_LOSS placed.');
                return;
            }

            // BASE/SAFETY entries:
            const orderType = order.price ? 'limit' : 'market';
            const price = order.price ? parseFloat(this.quantizePrice(order.price)) : undefined;

            logger.info({ botId: this.botId, orderId, type: order.type, side, amount, price }, 'Placing entry order...');
            const exOrder = await this.exchange.createOrder(
                this.bot.symbol,
                orderType,
                side,
                amount,
                price,
                params
            );

            order.exchangeOrderId = exOrder.id;
            order.status = 'OPEN';
            await order.save();
            logger.info({ botId: this.botId, orderId: order.id, exchangeOrderId: exOrder.id }, 'Entry order placed.');
        } catch (err) {
            order.status = 'FAILED_PLACEMENT';
            await order.save();
            logger.error({ botId: this.botId, orderId, error: err.message }, 'Failed to place order on exchange.');
            throw err;
        }
    }

    /**
     * Cancel an OPEN order on the exchange and mark as CANCELED in DB.
     */
    async cancelOrder(order) {
        try {
            await this.exchange.cancelOrder(order.exchangeOrderId, this.bot.symbol);
            logger.info({ botId: this.botId, orderId: order._id }, 'Exchange cancel sent.');
        } catch (e) {
            // Ignore "already canceled/not found"; log as warn for postmortem.
            logger.warn({ botId: this.botId, orderId: order._id, err: e.message }, 'Cancel order raised (ignored if benign).');
        } finally {
            order.status = 'CANCELED';
            await order.save();
            logger.info({ botId: this.botId, orderId: order._id }, 'Order marked CANCELED.');
        }
    }

    // -----------------------------------------------------------------------------
    // Helpers: direction/quantization/targets
    // -----------------------------------------------------------------------------

    getEntryExitSides(direction) {
        if (direction === 'LONG')  return { entry: 'buy',  exit: 'sell'  };
        if (direction === 'SHORT') return { entry: 'sell', exit: 'buy'   };
        throw new Error('Invalid direction');
    }

    quantizePrice(p) {
        return this.exchange.priceToPrecision(this.bot.symbol, p);
    }

    quantizeAmount(a) {
        return this.exchange.amountToPrecision(this.bot.symbol, a);
    }

    /**
     * Compute TP/SL absolute prices from current AEP and activeDirection.
     * Uses bot config:
     *  - enableTakeProfit / enableStopLoss (Booleans)
     *  - takeProfitPercent / stopLossPercent (Numbers in %)
     */
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

    // -----------------------------------------------------------------------------
    // Exit protection (TP/SL) management
    // -----------------------------------------------------------------------------

    /**
     * Ensure TP/SL orders exist and are aligned with the latest AEP/position.
     * - If TP exists and trackTpWithAep is true, cancel & recreate at new price
     * - SL always cancels & recreates (safer across venues) with new trigger
     * - Orders are queued for placement after the txn commit via session._ordersToPlace
     */
    async ensureExitProtection(session = null) {
        if (!this.bot.activeDeal || !this.bot.activeDirection) return;

        const positionQty = new Decimal(this.bot.positionContracts || 0);
        if (positionQty.lte(0)) return;

        const { exit } = this.getEntryExitSides(this.bot.activeDirection);
        const { tp, sl } = this.computeExitTargets();

        // 1) TAKE PROFIT (limit at tp)
        if (tp) {
            const existingTp = await DcaOrder.findOne({
                botId: this.botId,
                type: 'TAKE_PROFIT',
                status: { $in: ['PENDING_PLACEMENT', 'OPEN', 'PARTIALLY_FILLED'] }
            }).session?.(session);

            const mustReplace = this.bot.trackTpWithAep || !existingTp;

            if (mustReplace && existingTp && existingTp.exchangeOrderId) {
                try {
                    await this.exchange.cancelOrder(existingTp.exchangeOrderId, this.bot.symbol);
                    logger.info({ botId: this.botId, orderId: existingTp._id }, 'Canceled existing TP (tracking AEP).');
                } catch (_) {
                    logger.warn({ botId: this.botId, orderId: existingTp._id }, 'Cancel existing TP raised (ignored).');
                }
                existingTp.status = 'CANCELED';
                await existingTp.save({ session });
            }

            if (!existingTp || mustReplace) {
                const qty = this.quantizeAmount(positionQty.toNumber()); // full position size
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
                logger.info({ botId: this.botId, orderId: tpDoc._id, price: tp }, 'Prepared TAKE_PROFIT.');
            }
        }

        // 2) STOP LOSS (stop-market with stopPrice trigger)
        if (sl) {
            const existingSl = await DcaOrder.findOne({
                botId: this.botId,
                type: 'STOP_LOSS',
                status: { $in: ['PENDING_PLACEMENT', 'OPEN', 'PARTIALLY_FILLED'] }
            }).session?.(session);

            if (existingSl && existingSl.exchangeOrderId) {
                try {
                    await this.exchange.cancelOrder(existingSl.exchangeOrderId, this.bot.symbol);
                    logger.info({ botId: this.botId, orderId: existingSl._id }, 'Canceled existing SL (realign with new AEP).');
                } catch (_) {
                    logger.warn({ botId: this.botId, orderId: existingSl._id }, 'Cancel existing SL raised (ignored).');
                }
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
                // Using .price as "triggerPrice" for simplicity; if you have a dedicated field, use it.
                price: parseFloat(stopPrice),
                reduceOnly: this.bot.marketType === 'FUTURES',
                status: 'PENDING_PLACEMENT'
            });
            await slDoc.save({ session });
            session && (session._ordersToPlace = [...(session._ordersToPlace || []), slDoc._id]);
            logger.info({ botId: this.botId, orderId: slDoc._id, stopPrice: sl }, 'Prepared STOP_LOSS.');
        }
    }

    /**
     * Close the active deal after a TP/SL fill or soft-SL exit:
     * - Cancel any remaining exits and entries
     * - Reset bot state
     * - Increment completedDeals
     */
    async closeDealCleanup(session) {
        // Cancel exits
        const openExits = await DcaOrder.find({
            botId: this.botId,
            type: { $in: ['TAKE_PROFIT', 'STOP_LOSS'] },
            status: { $in: ['PENDING_PLACEMENT', 'OPEN', 'PARTIALLY_FILLED'] }
        }).session(session);

        for (const ex of openExits) {
            if (ex.exchangeOrderId) {
                try { await this.exchange.cancelOrder(ex.exchangeOrderId, this.bot.symbol); }
                catch (e) { logger.warn({ botId: this.botId, orderId: ex._id, err: e.message }, 'Cancel exit error'); }
            }
            ex.status = 'CANCELED';
            await ex.save({ session });
        }

        // Cancel entries
        const openEntries = await DcaOrder.find({
            botId: this.botId,
            type: { $in: ['BASE', 'SAFETY'] },
            status: { $in: ['PENDING_PLACEMENT', 'OPEN', 'PARTIALLY_FILLED'] }
        }).session(session);

        for (const e of openEntries) {
            if (e.exchangeOrderId) {
                try { await this.exchange.cancelOrder(e.exchangeOrderId, this.bot.symbol); }
                catch (er) { logger.warn({ botId: this.botId, orderId: e._id, err: er.message }, 'Cancel entry error'); }
            }
            e.status = 'CANCELED';
            await e.save({ session });
        }

        // Reset bot
        this.bot.activeDeal = false;
        this.bot.activeDirection = null;
        this.bot.averageEntryPrice = 0;
        this.bot.totalVolume = 0;
        this.bot.positionContracts = 0;
        this.bot.completedDeals = (this.bot.completedDeals || 0) + 1;
        await this.bot.save({ session });

        logger.info({ botId: this.botId }, 'Deal closed and bot state reset.');
    }

    // -----------------------------------------------------------------------------
    // Soft SL safety net
    // -----------------------------------------------------------------------------

    /**
     * Soft SL monitor for exchanges that lack native stops or when native stops fail.
     * - Check current price vs computed SL trigger
     * - If triggered: market-exit the entire position and close the deal via cleanup
     *
     * Call this periodically from your BotManager loop (e.g., every 3–5s).
     * It is a no-op if deal is inactive or SL disabled/not reached.
     */
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

            logger.warn({ botId: this.botId, price, sl, direction: this.bot.activeDirection, amount }, 'Soft SL triggered → market exit.');

            // Market exit, reduce-only in futures to avoid flipping.
            await this.exchange.createOrder(this.bot.symbol, 'market', exit, amount, undefined, {
                ...(this.bot.marketType === 'FUTURES' ? { reduceOnly: true } : {})
            });

            // Close deal in a small txn.
            const session = await mongoose.startSession();
            try {
                await session.withTransaction(async () => {
                    await this.closeDealCleanup(session);
                });
                logger.info({ botId: this.botId }, 'Soft SL cleanup completed.');
            } finally {
                await session.endSession();
            }
        } catch (e) {
            logger.error({ botId: this.botId, err: e.message, stack: e.stack }, 'softStopWatcher error');
        }
    }
}

module.exports = DcaStrategyService;
