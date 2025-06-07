// app/services/backtestService/BacktestRiskManager.js

const OptimizationManager = require('../../strategies/optimization/OptimizationManager');

/**
 * calculatePositionSize
 */
function calculatePositionSize(riskParams = {}, balance, price) {
    if (riskParams.positionSizingMethod === 'compound') {
        const frac = typeof riskParams.riskFraction === 'number' ? riskParams.riskFraction : 0.01;
        const riskAmount = balance * frac;
        if (riskParams.stopLossDistance > 0) {
            return riskAmount / (price * riskParams.stopLossDistance);
        }
        return riskAmount / price;
    }

    if (riskParams.positionSizingMethod === 'simple') {
        if (riskParams.positionSizeType === 'percentage' && riskParams.positionSizeValue != null) {
            return (balance * (riskParams.positionSizeValue / 100)) / price;
        }
        if (riskParams.positionSizeType === 'fixed' && riskParams.positionSizeValue != null) {
            return riskParams.positionSizeValue;
        }
    }

    // fallback 1% of balance
    return (balance * 0.01) / price;
}

/**
 * enforceRiskLimits
 */
function enforceRiskLimits(trades = [], riskParams = {}, currentBalance) {
    // if no limits specified, always allow
    if (
        riskParams.dailyLossLimit == null &&
        riskParams.maxDrawdown    == null &&
        riskParams.maxOpenTrades  == null
    ) return true;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // today's closed trades
    const todayTrades = trades.filter(t => new Date(t.exitTime) >= startOfDay);

    // 1) daily loss
    const dailyLoss = todayTrades
        .filter(t => t.profit < 0)
        .reduce((sum, t) => sum + t.profit, 0);
    if (
        riskParams.dailyLossLimit != null &&
        Math.abs(dailyLoss) >= riskParams.dailyLossLimit
    ) {
        console.warn(`Daily loss ${Math.abs(dailyLoss)} ≥ limit ${riskParams.dailyLossLimit}`);
        return false;
    }

    // 2) max drawdown
    if (riskParams.maxDrawdown != null) {
        let peak = currentBalance;
        let run  = currentBalance;
        for (const t of trades) {
            run += t.profit;
            if (run > peak) peak = run;
        }
        const drawdown = peak - currentBalance;
        if (drawdown >= riskParams.maxDrawdown) {
            console.warn(`Drawdown ${drawdown} ≥ limit ${riskParams.maxDrawdown}`);
            return false;
        }
    }

    // 3) max open trades
    if (riskParams.maxOpenTrades != null) {
        const openCount = trades.filter(t => !t.exitTime).length;
        if (openCount >= riskParams.maxOpenTrades) {
            console.warn(`Open trades ${openCount} ≥ limit ${riskParams.maxOpenTrades}`);
            return false;
        }
    }

    return true;
}

/**
 * calculateTPSL
 */
function calculateTPSL(params = {}, entryPrice) {
    if (
        typeof params.takeProfitPct === 'number' &&
        typeof params.stopLossPct   === 'number'
    ) {
        return {
            TP: entryPrice * (1 + params.takeProfitPct / 100),
            SL: entryPrice * (1 - params.stopLossPct   / 100)
        };
    }
    // default 2%/2%
    return { TP: entryPrice * 1.02, SL: entryPrice * 0.98 };
}

/**
 * optimizeParameters
 */
function optimizeParameters(symbol, indicators, method, historicalCandles) {
    return OptimizationManager.optimize(symbol, indicators, method, historicalCandles);
}

module.exports = {
    calculatePositionSize,
    enforceRiskLimits,
    calculateTPSL,
    optimizeParameters,
};
