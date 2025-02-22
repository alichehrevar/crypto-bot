const Trade = require('../../models/Trade');
const RiskStrategy = require('../../strategies/RiskStrategy'); // For calculating TP/SL

class OrderExecutionService {
    /**
     * Executes a trade based on the given signal.
     * @param {Object} bot - The bot document.
     * @param {string} signal - 'BUY' or 'SELL'
     * @param {number} price - The current price.
     * @param {Object} riskStrategyInstance - Instance for risk management strategy (if available).
     */
    async executeOrder(bot, signal, price, riskStrategyInstance) {
        // Retrieve open trades for this bot.
        const openTrades = await Trade.find({ bot: bot._id, exitPrice: null });
        if (signal === 'BUY') {
            if (bot.positionMode === 'single' && openTrades.length > 0) {
                console.log(`Bot "${bot.name}" in single mode already has an open trade.`);
                return;
            }
            let quantity = 0;
            if (riskStrategyInstance && typeof riskStrategyInstance.calculatePositionSize === 'function') {
                // If the function expects three parameters (e.g., lastTradeOutcome, balance, price), assume 'win' as default.
                if (riskStrategyInstance.calculatePositionSize.length === 3) {
                    quantity = riskStrategyInstance.calculatePositionSize('win', bot.paperBalance, price);
                } else {
                    quantity = riskStrategyInstance.calculatePositionSize(bot.paperBalance, price);
                }
            } else {
                // Fallback to default calculation.
                quantity = (bot.paperBalance * 0.01) / price;
            }
            // Compute TP/SL levels using the risk strategy module.
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
            if (openTrades.length === 0) {
                console.log(`Bot "${bot.name}" received SELL signal but no open trade exists.`);
                return;
            }
            // For simplicity, close the earliest open trade.
            const tradeToClose = openTrades[0];
            tradeToClose.exitPrice = price;
            tradeToClose.timestamp = new Date();
            if (tradeToClose.type === 'BUY') {
                tradeToClose.profit = (price - tradeToClose.entryPrice) * tradeToClose.quantity;
            } else {
                tradeToClose.profit = (tradeToClose.entryPrice - price) * tradeToClose.quantity;
            }
            await tradeToClose.save();
            console.log(`Bot "${bot.name}" closed trade at ${price}. Profit: ${tradeToClose.profit}`);
            if (bot.mode === 'paper' && typeof bot.paperBalance === 'number') {
                bot.paperBalance += tradeToClose.profit;
                await bot.save();
            }
        }
    }
}

module.exports = new OrderExecutionService();
