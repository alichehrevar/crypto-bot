// File: app/services/backtestService/riskUtils.js
/**
 * @file A collection of utility functions for calculating position size,
 * Take Profit/Stop Loss levels, and enforcing risk limits during a backtest.
 */
const DEFAULTS = {
    riskPct: 0.01,
    takeProfitPct: 0.02,
    stopLossPct: 0.02,
    leverage: 1,
    investment: null,
    dailyLossPct: null
};

const merge = (overrides = {}) => ({ ...DEFAULTS, ...overrides });

function calculatePositionSize(riskParams, balance, entryPrice, slPrice) {
    const p = merge(riskParams);
    if (typeof p.investment === 'number' && p.investment > 0) {
        return (p.investment * p.leverage) / entryPrice;
    }
    const riskPerUnit = Math.abs(entryPrice - slPrice);
    if (riskPerUnit === 0) return 0;
    const capitalAtRisk = balance * p.riskPct;
    return capitalAtRisk / riskPerUnit;
}

function calculateTPSL(riskParams, entryPrice, direction = 'LONG') {
    const p = merge(riskParams);
    if (direction === 'LONG') {
        return {
            TP: entryPrice * (1 + p.takeProfitPct),
            SL: entryPrice * (1 - p.stopLossPct)
        };
    } else { // SHORT
        return {
            TP: entryPrice * (1 - p.takeProfitPct),
            SL: entryPrice * (1 + p.stopLossPct)
        };
    }
}

function enforceRiskLimits(trades, riskParams, equityCurve, now, unrealisedPnL = 0) {
    const p = merge(riskParams);
    if (!p.dailyLossPct) return true;
    const startOfDayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const closedPnLToday = trades
        .filter(t => t.exitTime >= startOfDayUTC.getTime())
        .reduce((sum, t) => sum + t.profit, 0);
    const totalPnLToday = closedPnLToday + unrealisedPnL;
    if (totalPnLToday >= 0) return true;
    const currentEquity = equityCurve[equityCurve.length - 1];
    const lossLimit = currentEquity * p.dailyLossPct;
    if (Math.abs(totalPnLToday) >= lossLimit) {
        console.warn(`[Risk Breach] Daily loss limit hit.`);
        return false;
    }
    return true;
}

function getDefaultRisk() {
    // return a fresh copy so it can be safely merged
    return {
        riskPct: 0.01,
        takeProfitPct: 0.02,
        stopLossPct: 0.02,
        leverage: 1,
        investment: null,
        dailyLossPct: null
    };
}

module.exports = {
    calculatePositionSize,
    enforceRiskLimits,
    calculateTPSL,
    getDefaultRisk
};
