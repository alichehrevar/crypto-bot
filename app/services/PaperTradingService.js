class PaperTradingService {
    async executeOrder(bot, signal, price) {
        const positionSize = bot.riskParams.positionSizeType === 'percentage' ?
            bot.paperBalance * (bot.riskParams.positionSizeValue / 100) :
            bot.riskParams.positionSizeValue;

        const trade = {
            bot: bot._id,
            symbol: bot.symbol,
            type: signal,
            entryPrice: price,
            paper: true
        };

        // Update paper balance
        await Bot.findByIdAndUpdate(bot._id, {
            $inc: { paperBalance: -positionSize }
        });

        return trade;
    }
}

module.exports = new PaperTradingService();
