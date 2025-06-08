// app/services/backtestService/BacktestMetricsCalculator.js

/**
 * calculateMetrics
 *
 * @param {Array<Object>} trades
 * @param {Number} endingBalance
 * @returns {Object} metrics including finalBalance
 */
function calculateMetrics(trades, endingBalance) {
    const realTrades = trades.filter(t => !t.unrealized);
    const totalPnL    = realTrades.reduce((sum,t) => sum + t.profit, 0);
    const wins        = realTrades.filter(t => t.profit > 0).length;
    const winRate     = realTrades.length ? wins / realTrades.length : 0;
    const avgProfit   = realTrades.length ? totalPnL / realTrades.length : 0;
    // you can fill in a real max‐drawdown calc here; 0 as a placeholder
    const maxDrawdown = 0;

    return {
        totalPnL,
        winRate,
        avgProfit,
        maxDrawdown,
        finalBalance: endingBalance
    };
}

module.exports = { calculateMetrics };
