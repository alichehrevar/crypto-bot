const Bot = require('../models/BotBase');
const Trade = require('../models/Trade');

class PaperTradingService {
    /**
     * Execute a paper trade (BUY or SELL) at the given price.
     * @param {Object} bot - The Bot document
     * @param {String} signal - 'BUY' or 'SELL'
     * @param {Number} price - The current market price
     * @returns {Object} The trade object (or saved Trade document)
     */
    async executeOrder(bot, signal, price) {
        // 1) Find if there's an existing open trade (exitPrice = null)
        //    for this bot. If we allow multiple open trades, remove "findOne"
        const openTrade = await Trade.findOne({
            bot: bot._id,
            exitPrice: null,
            paper: true  // we can mark paper trades distinctly
        });

        // We'll store changes to the bot in this variable if needed
        let updatedPaperBalance = bot.paperBalance;

        // 2) Handle BUY (open new trade) or SELL (close existing trade)
        if (signal === 'BUY') {
            if (openTrade) {
                // Already have an open trade -> decide if you want to skip or "scale in"
                console.log(`PaperTrading: Bot "${bot.name}" tried to BUY but already has an open trade.`);
                return null;
            }

            // Calculate position size from bot.riskParams
            const positionSize = this.calculatePositionSize(bot, price);

            // Decrement paper balance by the cost (positionSize in quote currency)
            // For a "long" in typical crypto pairs: cost = positionSize * entryPrice
            const cost = positionSize * price;
            updatedPaperBalance = bot.paperBalance - cost;

            if (updatedPaperBalance < 0) {
                console.log(`PaperTrading: Bot "${bot.name}" has insufficient paper balance to open a BUY.`);
                return null;
            }

            // Save the new open trade
            const newTrade = new Trade({
                bot: bot._id,
                symbol: bot.symbol,
                type: 'BUY',
                entryPrice: price,
                quantity: positionSize,
                timestamp: new Date(),
                paper: true
            });
            await newTrade.save();

            // Update the bot's paperBalance
            bot.paperBalance = updatedPaperBalance;
            await bot.save();

            console.log(`PaperTrading: Bot "${bot.name}" opened a BUY at $${price} (qty: ${positionSize}). New balance: $${updatedPaperBalance}`);
            return newTrade;

        } else if (signal === 'SELL') {
            if (!openTrade) {
                // No open trade to close -> possibly open a short, or do nothing
                console.log(`PaperTrading: Bot "${bot.name}" received SELL but no open trade exists.`);
                return null;
            }

            // Close the open trade
            openTrade.exitPrice = price;
            openTrade.timestamp = new Date(); // or you could use a "closedAt" field
            // For a long trade, profit = (exitPrice - entryPrice) * quantity
            const tradeProfit = (price - openTrade.entryPrice) * openTrade.quantity;
            openTrade.profit = tradeProfit;
            await openTrade.save();

            // Credit the paper balance with the cost basis + profit
            // cost basis was originally deducted, so we add it back + profit
            updatedPaperBalance = bot.paperBalance + (openTrade.quantity * price);

            // Because we previously subtracted the cost of openTrade
            // from the paperBalance, the new "bot.paperBalance" is effectively:
            //   oldBalance + (exitPrice * qty)

            bot.paperBalance = updatedPaperBalance;
            await bot.save();

            console.log(`PaperTrading: Bot "${bot.name}" closed trade. Profit: $${tradeProfit}. New balance: $${updatedPaperBalance}`);
            return openTrade;
        }

        // If we got here, signal was not 'BUY' or 'SELL'
        console.log(`PaperTrading: Signal "${signal}" not recognized.`);
        return null;
    }

    /**
     * Calculate position size (base currency amount) based on the bot's riskParams.
     * For a 'percentage' type, the user is specifying how much of the *paperBalance*
     * to allocate. For a 'fixed' type, we interpret it as base currency amount.
     *
     * @param {Object} bot - The Bot doc
     * @param {Number} price - Current price for the pair
     * @returns {Number} quantity (base amount)
     */
    calculatePositionSize(bot, price) {
        const { riskParams, paperBalance } = bot;

        if (!riskParams || !riskParams.positionSizeType) {
            // No explicit risk params => default 1
            return 1;
        }

        const { positionSizeType, positionSizeValue } = riskParams;
        if (positionSizeType === 'percentage') {
            // e.g., if positionSizeValue=5 => 5% of paperBalance
            // paperBalance is in QUOTE currency (e.g. USDT).
            // If we want to find the base currency quantity:
            // quantity = (paperBalance * 0.05) / price
            return (paperBalance * (positionSizeValue / 100)) / price;
        } else if (positionSizeType === 'fixed') {
            // If "fixed" means a fixed base quantity (e.g. 0.1 BTC),
            // just return that directly
            return positionSizeValue;
        }

        // Default
        return 1;
    }
}

module.exports = new PaperTradingService();
