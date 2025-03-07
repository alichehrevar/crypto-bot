const Trade = require('../../models/Trade');
const RiskStrategy = require('../../strategies/moneyManagement/RiskManagement'); // For calculating TP/SL

class OrderExecutionService {
    /**
     * Executes a trade based on the given signal.
     * @param {Object} bot - The bot document.
     * @param {string} signal - 'BUY' or 'SELL'
     * @param {number} price - The current price.
     * @param {Object} riskStrategyInstance - Instance for risk management strategy (if available).
     */
    async executeOrder(bot, signal, price, riskStrategyInstance) {
        const openTrade = await Trade.findOne({ bot: bot._id, exitPrice: null });
        if (signal === 'BUY') {
            if (openTrade) {
                console.log(`Bot "${bot.name}" tried to BUY but already has an open trade.`);
                return;
            }
            let quantity = riskStrategyInstance.calculatePositionSize
                ? riskStrategyInstance.calculatePositionSize(bot.paperBalance, price)
                : (bot.paperBalance * 0.01) / price;
            // Compute TP/SL levels using your risk management module.
            const { TP, SL } = RiskStrategy.calculateTPSL(bot.strategyParams, price);
            const newTrade = new Trade({
                bot: bot._id,
                symbol: bot.symbol,
                type: 'BUY',
                entryPrice: price,
                quantity,
                timestamp: new Date()
            });
            await newTrade.save();
            console.log(`Bot "${bot.name}" opened BUY at ${price} with quantity ${quantity}, TP: ${TP}, SL: ${SL}`);
        } else if (signal === 'SELL') {
            if (!openTrade) {
                console.log(`Bot "${bot.name}" received SELL signal but no open trade exists.`);
                return;
            }
            openTrade.exitPrice = price;
            openTrade.timestamp = new Date();
            openTrade.profit = (price - openTrade.entryPrice) * openTrade.quantity;
            await openTrade.save();
            console.log(`Bot "${bot.name}" closed trade at ${price}. Profit: ${openTrade.profit}`);
            if (bot.mode === 'paper' && typeof bot.paperBalance === 'number') {
                bot.paperBalance += openTrade.profit;
            }
            // Update cumulative PnL.
            bot.cumulativePnL = (bot.cumulativePnL || 0) + openTrade.profit;

            // Check if bot-level TP/SL has been reached.
            // Assuming botTP is a positive profit threshold and botSL is a negative loss threshold.
            if ((bot.botTP && bot.cumulativePnL >= bot.botTP) || (bot.botSL && bot.cumulativePnL <= bot.botSL)) {
                console.log(`Bot "${bot.name}" has reached its bot-level TP/SL threshold. Stopping further trading.`);
                bot.active = false;  // Stop the bot from further trading.
            }
            await bot.save();
        }
    }
}

module.exports = new OrderExecutionService();
