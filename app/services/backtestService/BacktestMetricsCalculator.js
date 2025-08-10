// File: app/services/backtestService/BacktestMetricsCalculator.js
/**
 * @file Converts a series of trades and an equity curve into headline performance statistics.
 */
function calculateMetrics({ trades, equityCurve, initialBalance }) {
    const totalTrades = trades.length;
    const totalPnL = trades.reduce((sum, t) => sum + t.profit, 0);
    const wins = trades.filter(t => t.profit > 0).length;

    let peak = initialBalance;
    let maxDD = 0;
    for (const eq of equityCurve) {
        if (eq > peak) peak = eq;
        const dd = (peak - eq) / peak;
        if (dd > maxDD) maxDD = dd;
    }

    return {
        totalTrades,
        winRate: totalTrades ? wins / totalTrades : 0,
        totalPnL,
        avgProfit: totalTrades ? totalPnL / totalTrades : 0,
        avgTradeDuration: totalTrades ? trades.reduce((s, t) => s + t.duration, 0) / totalTrades : 0,
        maxDrawdown: maxDD,
        finalBalance: equityCurve.length > 0 ? equityCurve[equityCurve.length - 1] : initialBalance,
    };
}

module.exports = calculateMetrics;
