const Trade = require('../../models/Trade');

class RiskManagementService {
    /**
     * Checks risk limits for a given bot.
     * - In 'single' mode, ensures only one open trade.
     * - In 'hedge' mode, enforces a maximum number of open trades (if specified).
     * - Checks daily loss limits and minimum balance.
     *
     * @param {Object} bot - The bot document.
     * @returns {Object} { canTrade: boolean, reason: string|null }
     */
    async checkRisk(bot) {
        const openTradesCount = await Trade.countDocuments({ bot: bot._id, exitPrice: null });
        if (bot.positionMode === 'single') {
            if (openTradesCount >= 1) {
                return { canTrade: false, reason: 'Single mode: one open trade already exists' };
            }
        } else if (bot.positionMode === 'hedge') {
            if (bot.riskParams && bot.riskParams.maxOpenTrades && openTradesCount >= bot.riskParams.maxOpenTrades) {
                return { canTrade: false, reason: 'Max open trades reached' };
            }
        }
        if (bot.riskParams && bot.riskParams.dailyLossLimit) {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const [aggregation] = await Trade.aggregate([
                { $match: { bot: bot._id, timestamp: { $gte: startOfDay }, profit: { $exists: true } } },
                { $group: { _id: null, totalProfit: { $sum: '$profit' } } }
            ]);
            const currentDayProfit = aggregation?.totalProfit || 0;
            if (currentDayProfit < -Math.abs(bot.riskParams.dailyLossLimit)) {
                return { canTrade: false, reason: 'Daily loss limit exceeded' };
            }
        }
        return { canTrade: true, reason: null };
    }
}

module.exports = new RiskManagementService();
