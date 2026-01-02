// app/services/botService/OrderExecutionService.js

const Trade          = require('../../models/Trade');
const RiskStrategy   = require('../../strategies/moneyManagement/RiskManagement');
const ExchangeService = require('./ExchangeService'); // Use Unified Service
const botLogger      = require('../../../logs/botLogger');

class OrderExecutionService {

    async executeOrder(bot, signal, price, riskStrategyInstance) {
        // Safe logging helper
        const logger = botLogger.getLogger(bot._id.toString());
        const _log = (lvl, msg, meta = {}) => {
            if (logger && logger[lvl]) logger[lvl](msg, { botId: bot._id.toString(), ...meta });
        };

        _log('info', `🏁 Starting Execution Phase: ${signal} @ ${price}`);

        // 1) Check for existing open trade (One trade per bot logic)
        const openTrade = await Trade.findOne({ bot: bot._id, exitPrice: null });

        // 2) Determine Quantity (Position Sizing)
        let quantity = 0;
        let executedPrice = price; // Default to signal price (Paper/Backtest)

        if (signal === 'BUY') {
            if (openTrade) {
                _log('warn', `Block: Already has open trade during BUY signal`);
                return;
            }

            // --- SELECT FUND SOURCE ---
            // Live: Use baseFund (or real balance if you add fetchBalance logic)
            // Paper: Use paperBalance (Simulated compounding)
            let fund = bot.marketInfo.baseFund;
            if (bot.mode === 'paper') {
                fund = bot.paperBalance || bot.marketInfo.baseFund;
            }

            // --- CALCULATE QUANTITY ---
            if (riskStrategyInstance?.calculatePositionSize) {
                quantity = riskStrategyInstance.calculatePositionSize(fund, price);
            } else {
                const pct = bot.marketInfo.tradeFund || 100; // Percent of capital to use
                quantity = (fund * (pct / 100)) / price;
            }

            // Sanitize quantity (Prevent tiny decimals issues)
            quantity = parseFloat(quantity.toFixed(6));

            _log('info', `🧮 Calculated Qty: ${quantity}`, { fundUsed: fund, strategyPct: bot.marketInfo.tradeFund });
        }
        else if (signal === 'SELL') {
            if (!openTrade) {
                _log('warn', `Block: Received SELL but no open trade exists`);
                return;
            }
            quantity = openTrade.quantity;
        }
        else {
            return; // HOLD
        }

        // 3) Execution (Live vs Paper)
        if (bot.mode === 'live') {
            // --- LIVE EXECUTION ---
            if (!bot.accountType || !bot.accountId) {
                _log('error', `❌ Missing Account Config for Live Bot`);
                return;
            }

            try {
                _log('info', `🚀 Sending LIVE ${signal} Order to ${bot.accountType}...`);

                // Use Unified Exchange Service
                const exchange = await ExchangeService._getExchange(
                    bot.userId.toString(),
                    bot.accountType,
                    bot.accountId
                );

                const side = signal.toLowerCase(); // 'buy' or 'sell'

                // Execute Market Order
                const order = await exchange.createOrder(bot.symbol, 'market', side, quantity);

                // Capture actual fill price from exchange
                if (order) {
                    executedPrice = order.average || order.price || price;
                }

                _log('info', `✅ Broker Execution Success`, { orderId: order.id, price: executedPrice });

            } catch (err) {
                _log('error', `❌ Broker Execution Failed`, { error: err.message });
                return; // Do not record trade if broker failed
            }
        } else {
            // --- PAPER EXECUTION ---
            // No broker call. Just log and use the signal price.
            _log('info', `📝 Executing PAPER ${signal} @ ${price}`);
        }

        // 4) Database Recording & PnL
        if (signal === 'BUY') {
            const { TP, SL } = RiskStrategy.calculateTPSL(bot.strategyParams || {}, executedPrice);

            const t = new Trade({
                bot: bot._id,
                symbol: bot.symbol,
                type: 'BUY',
                entryPrice: executedPrice,
                quantity,
                TP,
                SL,
                timestamp: new Date()
            });
            await t.save();
            _log('info', `💾 DB: Saved BUY Trade`, { price: executedPrice, qty: quantity });
        }
        else if (signal === 'SELL') {
            openTrade.exitPrice = executedPrice;
            openTrade.timestamp = new Date(); // Close time

            // Profit: (Exit - Entry) * Qty
            // Assuming Long only for simple Indicator bots.
            // If Shorting is added, logic: (Entry - Exit) * Qty
            const profit = (executedPrice - openTrade.entryPrice) * openTrade.quantity;
            openTrade.profit = profit;

            await openTrade.save();

            // Update Balances
            bot.cumulativePnL = (bot.cumulativePnL || 0) + profit;
            if (bot.mode === 'paper') {
                bot.paperBalance = (bot.paperBalance || 0) + profit;
            }

            _log('info', `💾 DB: Closed Trade`, {
                entry: openTrade.entryPrice,
                exit: executedPrice,
                profit
            });

            // Check Bot-Level Stop Conditions (Hard Stop)
            if ((bot.botTP && bot.cumulativePnL >= bot.botTP) || (bot.botSL && bot.cumulativePnL <= bot.botSL)) {
                _log('warn', `🏁 Bot PnL Limit Reached. Stopping.`, { pnl: bot.cumulativePnL });
                bot.active = false;
            }
            await bot.save();
        }
    }
}

module.exports = new OrderExecutionService();
