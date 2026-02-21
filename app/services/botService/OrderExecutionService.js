// app/services/botService/OrderExecutionService.js

const Trade = require('../../models/Trade');
const RiskStrategy = require('../../strategies/moneyManagement/RiskManagement');
const ExchangeService = require('./ExchangeService');
const PaperTradingService = require('../PaperTradingService');
const botLogger = require('../../../logs/botLogger');

class OrderExecutionService {

    async executeOrder(bot, signal, price, riskStrategyInstance) {
        const logger = botLogger.getLogger(bot._id.toString());
        const _log = (lvl, msg, meta = {}) => {
            if (logger && logger[lvl]) logger[lvl](msg, { botId: bot._id.toString(), ...meta });
        };

        _log('info', `🏁 Starting Execution Phase: ${signal} @ ${price}`);

        const openTrade = await Trade.findOne({ bot: bot._id, exitPrice: null });

        let quantity = 0;
        let executedPrice = price;
        const mode = bot.mode || 'paper';

        // ==========================================
        // OPENING A POSITION
        // ==========================================
        if (signal === 'BUY') {
            if (openTrade) {
                _log('warn', `Block: Already has open trade during BUY signal`);
                return;
            }

            let fundToUse = 0;

            if (mode === 'live') {
                fundToUse = bot.marketInfo?.tradeFund || 0;
                if (fundToUse <= 0) return _log('error', `❌ Live Trade Blocked: tradeFund is 0.`);
            } else {
                // Strict 1% rule for Paper mode
                const currentBalance = bot.paperBalance || 10000;
                fundToUse = currentBalance * 0.01;
            }

            let rawQuantity = fundToUse / price;

            try {
                const filters = await ExchangeService.getMarketFilters(bot.userId.toString(), bot.symbol, bot.accountType, bot.accountId);
                const step = filters.stepSize;
                quantity = Math.floor(rawQuantity / step) * step;

                if (mode === 'live' && (quantity * price) < filters.minNotional) {
                    return _log('error', `❌ Trade Blocked: Below exchange minimum ($${filters.minNotional}).`);
                }
            } catch (err) {
                _log('warn', `Failed to fetch market filters, defaulting to 8 decimals`);
                quantity = parseFloat(rawQuantity.toFixed(8));
            }

            // --- EXECUTION ---
            if (mode === 'live') {
                try {
                    _log('info', `🚀 Sending LIVE BUY Order to ${bot.accountType}... Size: ${quantity}`);
                    const exchange = await ExchangeService._getExchange(bot.userId.toString(), bot.accountType, bot.accountId);

                    // 1. Send Main Entry Order
                    const order = await exchange.createOrder(bot.symbol, 'market', 'buy', quantity);
                    if (order) executedPrice = order.average || order.price || price;
                    _log('info', `✅ Broker Execution Success`, { orderId: order.id, price: executedPrice });

                    // 2. Calculate and Send TP/SL immediately
                    if (RiskStrategy && RiskStrategy.calculateTPSL) {
                        const { TP, SL } = RiskStrategy.calculateTPSL(bot.strategyParams || {}, executedPrice);
                        if (TP || SL) {
                            _log('info', `🎯 Dispatching TP/SL to exchange...`, { TP, SL });
                            // Call our new method!
                            await ExchangeService.placeTPSLOrders(bot, 'buy', quantity, TP, SL);
                        }
                    }

                } catch (err) {
                    _log('error', `❌ Broker Execution Failed`, { error: err.message });
                    return;
                }
            } else {
                bot.paperBalance -= (quantity * executedPrice);
                _log('info', `📝 Executing PAPER BUY @ ${executedPrice}`);
            }

            // --- DB RECORDING ---
            let TP = null, SL = null;
            if (RiskStrategy && RiskStrategy.calculateTPSL) {
                const limits = RiskStrategy.calculateTPSL(bot.strategyParams || {}, executedPrice);
                TP = limits.TP;
                SL = limits.SL;
            }

            const t = new Trade({
                bot: bot._id,
                symbol: bot.symbol,
                type: 'BUY',
                entryPrice: executedPrice,
                quantity: quantity,
                TP,
                SL,
                timestamp: new Date()
            });

            await t.save();
            await bot.save();
            _log('info', `💾 DB: Saved BUY Trade`);
        }

            // ==========================================
            // CLOSING A POSITION
        // ==========================================
        else if (signal === 'SELL') {
            if (!openTrade) return _log('warn', `Block: Received SELL but no open trade exists`);

            quantity = openTrade.quantity;

            if (mode === 'live') {
                try {
                    _log('info', `🚀 Sending LIVE SELL Order to close position...`);
                    const exchange = await ExchangeService._getExchange(bot.userId.toString(), bot.accountType, bot.accountId);

                    const params = bot.marketType === 'FUTURES' ? { reduceOnly: true } : {};
                    const order = await exchange.createOrder(bot.symbol, 'market', 'sell', quantity, undefined, params);

                    if (order) executedPrice = order.average || order.price || price;
                    _log('info', `✅ Broker Close Success`);

                } catch (err) {
                    return _log('error', `❌ Broker Execution Failed on CLOSE`, { error: err.message });
                }
            } else {
                _log('info', `📝 Executing PAPER SELL @ ${executedPrice}`);
            }

            // Calculate DB PnL
            openTrade.exitPrice = executedPrice;
            openTrade.timestamp = new Date();
            const profit = (executedPrice - openTrade.entryPrice) * openTrade.quantity;
            openTrade.profit = profit;
            await openTrade.save();

            bot.cumulativePnL = (bot.cumulativePnL || 0) + profit;
            if (mode === 'paper') bot.paperBalance = (bot.paperBalance || 0) + (openTrade.quantity * executedPrice);

            _log('info', `💾 DB: Closed Trade`, { entry: openTrade.entryPrice, exit: executedPrice, profit });

            if ((bot.botTP && bot.cumulativePnL >= bot.botTP) || (bot.botSL && bot.cumulativePnL <= bot.botSL)) {
                _log('warn', `🏁 Bot PnL Limit Reached. Stopping.`);
                bot.active = false;
            }
            await bot.save();
        }
    }
}

module.exports = new OrderExecutionService();
