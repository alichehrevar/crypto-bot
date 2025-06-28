// app/services/backtestService/riskUtils.js

function calculatePositionSize(riskParams = {}, balance, price) {
    if (riskParams && typeof riskParams.investment === 'number') {
        return (riskParams.investment * (riskParams.leverage || 1)) / price;
    }
    // Fallback if no specific investment amount is provided
    return (balance * 0.01) / price;
}

function enforceRiskLimits(trades = [], riskParams = {}, currentBalance) {
    if (!riskParams || Object.keys(riskParams).length === 0) return true;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayTrades = trades.filter(t => new Date(t.exitTime) >= startOfDay);

    const dailyLoss = todayTrades
        .filter(t => t.profit < 0)
        .reduce((sum, t) => sum + t.profit, 0);

    if (riskParams.dailyLossLimit != null && Math.abs(dailyLoss) >= riskParams.dailyLossLimit) {
        console.warn(`Risk Breach: Daily loss limit`);
        return false;
    }

    // Additional risk limit logic can be added here...

    return true;
}

function calculateTPSL(params = {}, entryPrice) {
    if (typeof params.takeProfitPct === 'number' && typeof params.stopLossPct === 'number') {
        return {
            TP: entryPrice * (1 + params.takeProfitPct / 100),
            SL: entryPrice * (1 - params.stopLossPct / 100)
        };
    }
    return { TP: entryPrice * 1.02, SL: entryPrice * 0.98 };
}

module.exports = {
    calculatePositionSize,
    enforceRiskLimits,
    calculateTPSL,
};
