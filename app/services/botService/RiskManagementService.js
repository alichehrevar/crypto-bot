// app/services/botService/RiskManagementService.js

const Trade = require('../../models/Trade');
const botLogger = require('../../../logs/botLogger');

class RiskManagementService {
    /**
     * Checks risk limits for a given bot.
     * Logs detailed reasoning for approval or rejection.
     */
    async checkRisk(bot) {
        const logger = botLogger.getLogger(bot._id.toString());

        // 1. Check Open Trades (Concurrency)
        const openTradesCount = await Trade.countDocuments({ bot: bot._id, exitPrice: null });

        // Log the check
        await this._log(logger, 'info', `Risk Check: Open Trades Count = ${openTradesCount}`, bot, {
            mode: bot.positionMode,
            count: openTradesCount
        });

        if (bot.positionMode === 'single') {
            if (openTradesCount >= 1) {
                const reason = 'Single mode: one open trade already exists';
                await this._log(logger, 'warn', `🚫 Risk Block: ${reason}`, bot);
                return { canTrade: false, reason };
            }
        } else if (bot.positionMode === 'hedge') {
            if (bot.riskParams && bot.riskParams.maxOpenTrades && openTradesCount >= bot.riskParams.maxOpenTrades) {
                const reason = `Max open trades reached (${openTradesCount}/${bot.riskParams.maxOpenTrades})`;
                await this._log(logger, 'warn', `🚫 Risk Block: ${reason}`, bot);
                return { canTrade: false, reason };
            }
        }

        // 2. Check Daily Loss Limit
        if (bot.riskParams && bot.riskParams.dailyLossLimit) {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            const [aggregation] = await Trade.aggregate([
                { $match: { bot: bot._id, timestamp: { $gte: startOfDay }, profit: { $exists: true } } },
                { $group: { _id: null, totalProfit: { $sum: '$profit' } } }
            ]);

            const currentDayProfit = aggregation?.totalProfit || 0;
            const limit = -Math.abs(bot.riskParams.dailyLossLimit);

            // Log the calculation
            await this._log(logger, 'info', `Risk Check: Daily PnL Calculation`, bot, {
                currentDayProfit,
                lossLimit: limit
            });

            if (currentDayProfit < limit) {
                const reason = `Daily loss limit exceeded (Curr: ${currentDayProfit}, Limit: ${limit})`;
                await this._log(logger, 'warn', `🚫 Risk Block: ${reason}`, bot);
                return { canTrade: false, reason };
            }
        }

        // 3. Passed
        await this._log(logger, 'info', `✅ Risk Check Passed`, bot);
        return { canTrade: true, reason: null };
    }

    // Helper for safe logging
    async _log(logger, level, message, bot, meta = {}) {
        if (logger && logger[level]) {
            logger[level](message, meta);
        }
    }
}

module.exports = new RiskManagementService();
