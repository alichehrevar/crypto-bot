// app/services/botService/OrderExecutionService.js

const Trade          = require('../../models/Trade');
const RiskStrategy   = require('../../strategies/moneyManagement/RiskManagement');
const ExchangeService = require('./ExchangeService'); // Unified Service
const botLogger      = require('../../../logs/botLogger');

class OrderExecutionService {

    async executeOrder(bot, signal, price, riskStrategyInstance) {
        // Safe logging helper
        const logger = botLogger.getLogger(bot._id.toString());
        const _log = (lvl, msg, meta = {}) => {
            if (logger && logger[lvl]) logger[lvl](msg, { botId: bot._id.toString(), ...meta });
        };

        _log('info', `🏁 Starting Execution Phase: ${signal} @ ${price}`);

        // 1) Check for existing open trade
        const openTrade = await Trade.findOne({ bot: bot._id, exitPrice: null });

        // 2) Determine Quantity (Position Sizing)
        let quantity = 0;
        let executedPrice = price;

        if (signal === 'BUY') {
            if (openTrade) {
                _log('warn', `Block: Already has open trade during BUY signal`);
                return;
            }

            let fundToUse = 0;
            const mode = bot.mode || 'paper'; // Default to paper if missing

            if (mode === 'live') {
                // --- LIVE MODE: Use Full Trade Fund ---
                // Example: If tradeFund is 1.2, we use $1.20
                fundToUse = bot.marketInfo.tradeFund || 0;

                if (fundToUse <= 0) {
                    _log('error', `❌ Live Trade Blocked: tradeFund is 0 or missing.`);
                    return;
                }

                _log('info', `🧮 Live Mode: Using Full Trade Fund ($${fundToUse})`);
            }
            else {
                // --- PAPER MODE: Use 1% of Paper Balance ---
                // Example: 1% of 10,000 = $100
                const currentBalance = bot.paperBalance || 10000;
                fundToUse = currentBalance * 0.01;

                _log('info', `🧮 Paper Mode: Using 1% of Balance ($${fundToUse})`, { balance: currentBalance });
            }

            // Calculate Quantity: Amount / Price
            quantity = fundToUse / price;

            // Sanitize quantity (avoid extremely long decimals)
            quantity = parseFloat(quantity.toFixed(8)); // 8 decimals standard for crypto

            _log('info', `⚖️ Position Size Calculated: ${quantity} ${bot.symbol.replace('/','').replace('USDT','')}`);
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
            if (!bot.accountType || !bot.accountId) {
                _log('error', `❌ Missing Account Config for Live Bot`);
                return;
            }

            try {
                _log('info', `🚀 Sending LIVE ${signal} Order to ${bot.accountType}...`);

                const exchange = await ExchangeService._getExchange(
                    bot.userId.toString(),
                    bot.accountType,
                    bot.accountId
                );

                const side = signal.toLowerCase();

                // Execute Market Order
                const order = await exchange.createOrder(bot.symbol, 'market', side, quantity);

                if (order) {
                    executedPrice = order.average || order.price || price;
                }

                _log('info', `✅ Broker Execution Success`, { orderId: order.id, price: executedPrice });

            } catch (err) {
                _log('error', `❌ Broker Execution Failed`, { error: err.message });
                return; // Do not record trade if broker failed
            }
        } else {
            // Paper Execution
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

            // Check Bot-Level Stop Conditions
            if ((bot.botTP && bot.cumulativePnL >= bot.botTP) || (bot.botSL && bot.cumulativePnL <= bot.botSL)) {
                _log('warn', `🏁 Bot PnL Limit Reached. Stopping.`, { pnl: bot.cumulativePnL });
                bot.active = false;
            }
            await bot.save();
        }
    }
}

module.exports = new OrderExecutionService();
