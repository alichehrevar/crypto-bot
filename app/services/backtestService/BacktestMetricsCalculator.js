/**
 * Calculates basic performance metrics from a list of trades.
 * @param {Array} trades - Array of trade objects.
 * @returns {Object} Metrics summary.
 */
function calculateMetrics(trades) {
    const realTrades = trades.filter(t => !t.unrealized);
    if (realTrades.length === 0) {
        return {
            totalPnL: 0,
            winRate: 0,
            avgProfit: 0,
            maxDrawdown: 0,
        };
    }
    const totalPnL = realTrades.reduce((sum, t) => sum + t.profit, 0);
    const wins = realTrades.filter(t => t.profit > 0).length;
    const winRate = wins / realTrades.length;
    const avgProfit = totalPnL / realTrades.length;
    return { totalPnL, winRate, avgProfit, maxDrawdown: 0 };
}

module.exports = { calculateMetrics };
