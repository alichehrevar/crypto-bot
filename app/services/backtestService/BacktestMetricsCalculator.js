/**
 * BacktestMetricsCalculator
 *
 * Computes performance metrics from an array of trades.
 *
 * @param {Array<Object>} trades - Array of trade objects (each with a profit property, etc.).
 * @returns {Object} metrics - Contains totalPnL, winRate, average profit, and maxDrawdown.
 */
function calculateMetrics(trades) {
    // Filter out unrealized (open) trades.
    const realTrades = trades.filter(trade => !trade.unrealized);
    if (realTrades.length === 0) {
        return {
            totalPnL: 0,
            winRate: 0,
            avgProfit: 0,
            maxDrawdown: 0
        };
    }

    // Total profit/loss from all closed trades.
    const totalPnL = realTrades.reduce((sum, trade) => sum + trade.profit, 0);
    // Count winning trades.
    const wins = realTrades.filter(trade => trade.profit > 0).length;
    // Calculate win rate.
    const winRate = wins / realTrades.length;
    // Average profit per trade.
    const avgProfit = totalPnL / realTrades.length;
    // Max drawdown can be implemented later; here we return 0 as a placeholder.
    const maxDrawdown = 0;

    return {
        totalPnL,
        winRate,
        avgProfit,
        maxDrawdown
    };
}

module.exports = { calculateMetrics };
