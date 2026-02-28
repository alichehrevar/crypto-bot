/**
 * Helper to calculate statistical metrics from a list of trades
 */
exports.calculateBotMetrics = (bot, trades) => {
    // 🚀 FIX: Dynamically use paperBalance for paper bots, baseFund for live bots
    const baseFund = bot.mode === 'paper'
        ? (bot.paperBalance || 10000)
        : (bot.marketInfo?.baseFund || 1000);

    let equity = baseFund;
    let peakEquity = baseFund;
    let maxDrawdown = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let wins = 0;

    const returns = [];

    // 🚀 FIX: Only calculate metrics on fully closed trades
    const closedTrades = trades.filter(t => t.exitPrice !== undefined && t.exitPrice !== null);

    for (const trade of closedTrades) {
        const profit = trade.profit || 0;

        if (profit > 0) {
            wins++;
            grossProfit += profit;
        } else {
            grossLoss += Math.abs(profit);
        }

        equity += profit;
        if (equity > peakEquity) {
            peakEquity = equity;
        } else {
            const drawdown = (peakEquity - equity) / peakEquity;
            if (drawdown > maxDrawdown) maxDrawdown = drawdown;
        }

        const prevEquity = equity - profit;
        if (prevEquity > 0) returns.push(profit / prevEquity);
    }

    const totalTrades = closedTrades.length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss) : (grossProfit > 0 ? 999 : 0);
    const roi = ((equity - baseFund) / baseFund) * 100;

    let sharpe = 0;
    if (returns.length > 1) {
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (returns.length - 1);
        const stdDev = Math.sqrt(variance);
        sharpe = stdDev > 0 ? (mean / stdDev) : 0;
    }

    return {
        roi: roi.toFixed(2),
        winRate: winRate.toFixed(2),
        drawdown: (maxDrawdown * 100).toFixed(2),
        profitFactor: profitFactor.toFixed(2),
        sharpe: sharpe.toFixed(3),
        totalTrades: totalTrades,
        pnlValue: (equity - baseFund).toFixed(2)
    };
}
