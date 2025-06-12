// app/services/backtestService/BacktestMetricsCalculator.js

/**
 * calculateMetrics
 *
 * @param {Array<Object>} trades             – all trade records (may include unrealized)
 * @param {Number}       endingBalance       – final account balance after last close
 * @returns {Object} metrics including finalBalance
 */
function calculateMetrics(trades, endingBalance) {
    // ignore any in-flight/unclosed trades
    const realTrades = trades.filter(t => !t.unrealized);

    const totalTrades    = realTrades.length;
    const wins           = realTrades.filter(t => t.profit > 0).length;
    const totalPnL       = realTrades.reduce((sum, t) => sum + t.profit, 0);
    const totalDuration  = realTrades.reduce((sum, t) => sum + (t.duration || 0), 0);

    // avoid divide-by-zero
    const winRate          = totalTrades > 0 ? wins / totalTrades : 0;
    const avgProfit        = totalTrades > 0 ? totalPnL / totalTrades  : 0;
    const avgTradeDuration = totalTrades > 0 ? totalDuration / totalTrades : 0;

    // placeholder for a proper max drawdown calculation if you add one later
    const maxDrawdown = 0;

    return {
        totalTrades,
        totalPnL,
        winRate,
        avgProfit,
        avgTradeDuration,
        maxDrawdown,
        finalBalance: endingBalance
    };
}

module.exports = { calculateMetrics };
