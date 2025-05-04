// app/services/PnLService.js
const Trade = require('../models/Trade');

class PnLService {
    /**
     * @param {ObjectId|string} botId
     * @param {number} currentPrice
     */
    async getBotPnL(botId, currentPrice) {
        const trades = await Trade.find({ bot: botId }).lean();

        const realized = trades
            .filter(t => t.exitPrice != null)
            .reduce((sum, t) => sum + (t.profit || 0), 0);

        const unrealized = trades
            .filter(t => t.exitPrice == null)
            .reduce((sum, t) => sum + ((currentPrice - t.entryPrice) * t.quantity), 0);

        const total = realized + unrealized;

        return { realized, unrealized, total };
    }
}

module.exports = new PnLService();
