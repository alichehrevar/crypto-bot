// app/services/backtestService/BacktestMetricsCalculator.js
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

    const MS_PER_MIN = 60 * 1000;
    const avgTradeDurationMins = totalTrades
        ? trades.reduce((s, t) => s + ((t.duration || 0) / MS_PER_MIN), 0) / totalTrades
        : 0;

    return {
        totalTrades,
        winRate: totalTrades ? wins / totalTrades : 0,
        totalPnL,
        avgProfit: totalTrades ? totalPnL / totalTrades : 0,
        avgTradeDuration: avgTradeDurationMins, // <-- minutes (UI expects minutes)
        maxDrawdown: maxDD,
        finalBalance: equityCurve.length > 0 ? equityCurve[equityCurve.length - 1] : initialBalance,
    };
}

module.exports = calculateMetrics;
