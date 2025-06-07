// app/services/backtestService/BacktestMetricsCalculator.js

function calculateMetrics(trades = [], finalBalance = 0) {
    const closed = trades.filter(t => !t.unrealized);
    if (!closed.length) {
        return { totalPnL: 0, winRate: 0, avgProfit: 0, maxDrawdown: 0, finalBalance };
    }

    const totalPnL  = closed.reduce((sum, t) => sum + t.profit, 0);
    const wins      = closed.filter(t => t.profit > 0).length;
    const winRate   = wins / closed.length;
    const avgProfit = totalPnL / closed.length;

    // placeholder for drawdown
    const maxDrawdown = 0;

    return { totalPnL, winRate, avgProfit, maxDrawdown, finalBalance };
}

module.exports = { calculateMetrics };
