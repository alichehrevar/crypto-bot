// services/botService/DcaStrategyService.js

const mongoose = require('mongoose');
const Decimal = require('decimal.js');
// REMOVED: const { v4: uuidv4 } = require('uuid'); (Causes Crash)

const DcaBot   = require('../../models/DcaBot');
const DcaOrder = require('../../models/DcaOrder');
const DcaFill  = require('../../models/DcaFill');

const ExchangeService = require('./ExchangeService');
const botLogger = require('../../../logs/botLogger');

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

    async initialize() {
        this.bot = await DcaBot.findById(this.botId).populate('userId');
        if (!this.bot) throw new Error(`DCA Bot ${this.botId} not found.`);

        this._log('info', `🤖 Initializing DCA Bot: ${this.bot.name}`, {
            mode: this.bot.mode,
            symbol: this.bot.symbol
        });

        try {
            // Always connect to exchange for Price Feeds (even in Paper mode)
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
                    throw new Error(`Market pair not found for "${raw}".`);
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

            // Resume or Start
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

            // WebSocket/Polling (Only needed for LIVE orders)
            if (this.bot.mode === 'live' && typeof ExchangeService.subscribeOrderFills === 'function') {
                this._unsubFills = ExchangeService.subscribeOrderFills(
                    this.bot.userId._id.toString(),
                    this.tradeSymbol,
                    async (trade) => {
                        try { await this.processFill(trade); }
                        catch (err) { this._log('error', 'WS Error', { error: err.message }); }
                    }
                );
                this._log('info', `📡 Listening for Live Trade Fills...`);
            }

            // WATCHDOG LOOP (Handles Soft SL + PAPER TRADING Simulation)
            this._softSlTimer = setInterval(() => {
                this.onTick().catch(err =>
                    this._log('error', 'Watchdog Tick Error', { error: err.message })
                );
            }, 4000);

            this._log('info', `DCA Bot Started (${this.bot.mode.toUpperCase()} Mode)`);

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

    // =========================================================================
    //  WATCHDOG (Soft SL + Paper Simulation)
    // =========================================================================

    async onTick() {
        if (!this.bot) await this.initialize();

        // 1. Fetch Real-Time Price
        const ticker = await this.exchange.fetchTicker(this.tradeSymbol);
        const currentPrice = ticker.last;

        // 2. Check Soft Stop Loss
        await this.softStopWatcher(currentPrice);

        // 3. PAPER MODE: Check for simulated fills
        if (this.bot.mode === 'paper') {
            await this.simulatePaperFills(currentPrice);
        }
    }

    /**
     * Checks OPEN paper orders to see if the market price hit them.
     */
    async simulatePaperFills(currentPrice) {
        // --- FIX: Dynamic Import for uuid ---
        const { v4: uuidv4 } = await import('uuid');

        const openOrders = await DcaOrder.find({
            botId: this.botId,
            status: { $in: ['OPEN', 'PENDING_PLACEMENT'] }
        });

        for (const order of openOrders) {
            // Only process orders marked as 'paper-'
            if (!order.exchangeOrderId || !order.exchangeOrderId.startsWith('paper-')) continue;

            let isFilled = false;

            const isBuy = order.side === 'BUY';
            const price = order.price; // Limit price

            // Logic: Buy if Price <= Limit, Sell if Price >= Limit
            if (order.type === 'STOP_LOSS') {
                // Stop Market simulation
                const trigger = order.price;
                if ((isBuy && currentPrice >= trigger) || (!isBuy && currentPrice <= trigger)) {
                    // Stop triggered -> Execute as market
                    isFilled = true;
                }
            } else if (order.price) {
                // Limit Order
                if ((isBuy && currentPrice <= price) || (!isBuy && currentPrice >= price)) {
                    isFilled = true;
                }
            }

            if (isFilled) {
                this._log('info', `📝 Paper Fill Triggered: ${order.type} @ ${currentPrice}`);
                await this.processFill({
                    id: `sim-trade-${uuidv4()}`, // Fake Trade ID
                    orderId: order.exchangeOrderId,
                    price: currentPrice,
                    amount: order.qty,
                    side: order.side.toLowerCase(),
                    fee: 0
                });
            }
        }
    }

    // =========================================================================
    //  EXECUTION LOGIC (Live vs Paper)
    // =========================================================================

    async executeOrder(orderId) {
        const order = await DcaOrder.findById(orderId);
        if (!order || order.status !== 'PENDING_PLACEMENT') return;

        // --- PAPER TRADING BRANCH ---
        if (this.bot.mode === 'paper') {
            await this.executePaperOrder(order);
            return;
        }

        // --- LIVE TRADING BRANCH ---
        try {
            const side = order.side.toLowerCase();
            const params = this.bot.marketType === 'FUTURES' && order.reduceOnly ? { reduceOnly: true } : {};
            const amount = parseFloat(order.qty);

            this._log('info', `🚀 Executing LIVE ${order.type}`, { side, amount, price: order.price });

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
            this._log('info', `✅ Live Order Placed`, { exchangeId: exOrder.id });

        } catch (err) {
            order.status = 'FAILED_PLACEMENT';
            await order.save();
            this._log('error', `❌ Live Execution Failed`, { orderId: order._id, reason: err.message });
        }
    }

    async executePaperOrder(order) {
        // --- FIX: Dynamic Import for uuid ---
        const { v4: uuidv4 } = await import('uuid');

        const mockId = `paper-${uuidv4()}`;
        order.exchangeOrderId = mockId;
        order.status = 'OPEN';
        await order.save();

        this._log('info', `📝 Paper Order Created (${order.type})`, { mockId, price: order.price || 'MARKET' });

        // If MARKET order, fill immediately
        // Note: STOP_LOSS in DB usually has a trigger price, so it waits.
        // If type is BASE/SAFETY and price is null => Market => Fill Now.
        if (!order.price && order.type !== 'STOP_LOSS') {
            const ticker = await this.exchange.fetchTicker(this.tradeSymbol);
            await this.processFill({
                id: `sim-fill-${uuidv4()}`,
                orderId: mockId,
                price: ticker.last,
                amount: order.qty,
                side: order.side.toLowerCase()
            });
        }
    }

    async cancelOrder(order) {
        if (this.bot.mode === 'live') {
            try {
                if (order.exchangeOrderId) await this.exchange.cancelOrder(order.exchangeOrderId, this.tradeSymbol);
                this._log('info', `🚫 Live Order Canceled`, { id: order._id });
            } catch (e) {
                this._log('warn', `Cancel Failed`, { error: e.message });
            }
        } else {
            this._log('info', `🚫 Paper Order Canceled`, { id: order._id });
        }

        order.status = 'CANCELED';
        await order.save();
    }

    // =========================================================================
    //  CORE LOGIC & PnL
    // =========================================================================

    async processFill(trade) {
        if (!this.bot) await this.initialize();
        this._log('info', `⚡ Fill Detected: ${trade.side} ${trade.amount} @ ${trade.price}`);

        let sessionOrdersToPlace = [];
        let sessionCancelId = null;

        try {
            await this._executeTransaction(async (session) => {
                const order = await DcaOrder.findOne({ botId: this.botId, exchangeOrderId: trade.orderId }).session(session);
                if (!order) return;

                // Idempotency check
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

                // --- 1. HANDLE EXIT (TP/SL) -> CALCULATE PnL ---
                if (order.type === 'TAKE_PROFIT' || order.type === 'STOP_LOSS') {
                    // Calculate Profit: (Exit - AvgEntry) * Qty * (1 or -1 for Short)
                    const exitPrice = new Decimal(trade.price);
                    const entryPrice = new Decimal(this.bot.averageEntryPrice);
                    const qty = new Decimal(trade.amount);
                    const isLong = this.bot.activeDirection === 'LONG';

                    let profit = isLong
                        ? exitPrice.minus(entryPrice).mul(qty)
                        : entryPrice.minus(exitPrice).mul(qty);

                    // Update Bot Balances
                    const profitNum = profit.toNumber();
                    this.bot.cumulativePnL = (this.bot.cumulativePnL || 0) + profitNum;

                    if (this.bot.mode === 'paper') {
                        this.bot.paperBalance = (this.bot.paperBalance || 0) + profitNum;
                    }

                    await this.bot.save({ session });

                    this._log('info', `💰 Deal Closed via ${order.type}`, {
                        profit: profitNum,
                        newBalance: this.bot.mode === 'paper' ? this.bot.paperBalance : 'N/A'
                    });

                    await this.closeDealCleanup(session);
                    return; // Done
                }

                // --- 2. HANDLE ENTRY (BASE/SAFETY) ---
                const isBase = order.type === 'BASE';
                const isNeutral = this.bot.direction === 'NEUTRAL';

                // NEUTRAL Lock Logic
                if (isBase && isNeutral && !this.bot.activeDirection) {
                    const lockedDir = order.side === 'BUY' ? 'LONG' : 'SHORT';
                    this.bot.activeDirection = lockedDir;

                    const oppSide = order.side === 'BUY' ? 'SELL' : 'BUY';
                    const opposite = await DcaOrder.findOne({ botId: this.botId, type: 'BASE', side: oppSide, status: 'OPEN' }).session(session);
                    if (opposite) {
                        opposite.status = 'PENDING_CANCEL';
                        await opposite.save({ session });
                        sessionCancelId = opposite._id;
                    }
                    await this.bot.save({ session });
                }

                // Update AEP
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

                this._log('info', `🧮 AEP Updated`, { newAep: this.bot.averageEntryPrice });

                // Refresh Exits
                await this.ensureExitProtection(session, (id) => sessionOrdersToPlace.push(id));
            });

            // Post-Commit Actions
            if (sessionCancelId) {
                const opp = await DcaOrder.findById(sessionCancelId);
                if (opp) await this.cancelOrder(opp);
            }
            if (sessionOrdersToPlace.length > 0) {
                for (const id of sessionOrdersToPlace) await this.executeOrder(id);
            }

        } catch (error) {
            this._log('error', `ProcessFill Failed`, { error: error.message });
        }
    }

    // ... (Keep existing prepareOrder, getEntryExitSides, quantizePrice, quantizeAmount methods) ...

    async _executeTransaction(workFunction) {
        const session = await mongoose.startSession();
        try {
            session.startTransaction();
            await workFunction(session);
            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            if (error.message.includes('Transaction numbers are only allowed on a replica set')) {
                await workFunction(null);
                return;
            }
            throw error;
        } finally {
            await session.endSession();
        }
    }

    async prepareOrder(session, type, volume, price, side) {
        // --- FIX: Dynamic Import for uuid ---
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

    async startNewDeal() {
        if (!this.bot) await this.initialize();
        if (this.bot.activeDeal) return;

        const ticker = await this.exchange.fetchTicker(this.tradeSymbol);
        const refPrice = ticker.last;

        this._log('info', `🚀 Starting New Deal`, { price: refPrice, direction: this.bot.direction });

        try {
            await this._executeTransaction(async (session) => {
                const baseVol = this.bot.baseOrderVolume;
                // ... (Logic from previous snippet for NEUTRAL/LONG/SHORT entries) ...
                if (this.bot.direction === 'NEUTRAL') {
                    const deviation = (this.bot.neutralEntryDeviation || 0) / 100;
                    const longPrice  = refPrice * (1 - deviation);
                    const shortPrice = refPrice * (1 + deviation);
                    const longBase  = await this.prepareOrder(session, 'BASE', baseVol, longPrice,  'BUY');
                    const shortBase = await this.prepareOrder(session, 'BASE', baseVol, shortPrice, 'SELL');
                    session.ordersToExec = [longBase.id, shortBase.id];
                } else {
                    const side = this.bot.direction === 'LONG' ? 'BUY' : 'SELL';
                    const price = this.bot.useMarketForEntry ? null : refPrice;
                    const entry = await this.prepareOrder(session, 'BASE', baseVol, price, side);
                    session.ordersToExec = [entry.id];
                }

                this.bot.activeDeal = true;
                this.bot.activeDirection = null;
                this.bot.averageEntryPrice = 0;
                this.bot.totalVolume = 0;
                this.bot.positionContracts = 0;
                await this.bot.save({ session });
            });

            const pending = await DcaOrder.find({ botId: this.botId, status: 'PENDING_PLACEMENT' });
            for (const order of pending) {
                await this.executeOrder(order._id);
            }

        } catch (error) {
            this._log('error', `Start Deal Failed`, { error: error.message });
        }
    }

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
            await this.cancelOrder(o); // Will handle Live/Paper split
        }

        this.bot.activeDeal = false;
        this.bot.activeDirection = null;
        this.bot.completedDeals = (this.bot.completedDeals || 0) + 1;
        await this.bot.save({ session });

        this._log('info', `🏁 Deal Cycle Ended.`);
    }

    async softStopWatcher(currentPrice) {
        if (!this.bot.activeDeal || !this.bot.enableStopLoss) return;
        const { sl } = this.computeExitTargets();
        if (!sl) return;

        const isLong = this.bot.activeDirection === 'LONG';
        if ((isLong && currentPrice <= sl) || (!isLong && currentPrice >= sl)) {
            this._log('warn', `🚨 Soft SL Triggered at ${currentPrice}`);

            const { exit } = this.getEntryExitSides(this.bot.activeDirection);
            const amount = parseFloat(this.quantizeAmount(this.bot.positionContracts));

            if (this.bot.mode === 'live') {
                await this.exchange.createOrder(this.tradeSymbol, 'market', exit.toLowerCase(), amount, undefined, {
                    ...(this.bot.marketType === 'FUTURES' ? { reduceOnly: true } : {})
                });
            } else {
                // --- FIX: Dynamic Import for uuid ---
                const { v4: uuidv4 } = await import('uuid');

                // Paper mode market exit
                await this.processFill({
                    id: `soft-sl-${uuidv4()}`,
                    orderId: 'soft-sl',
                    price: currentPrice,
                    amount: amount,
                    side: exit.toLowerCase()
                });
            }

            await this._executeTransaction(async (session) => {
                await this.closeDealCleanup(session);
            });
        }
    }
}

module.exports = DcaStrategyService;
