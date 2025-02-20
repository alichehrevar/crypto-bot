/**
 * This module implements refined risk functions for:
 *  - Calculating position size using either a risk fraction with a stop-loss distance or fixed/percentage sizing.
 *  - Enforcing risk limits such as maximum daily loss and minimum account balance.
 *  - Calculating Take Profit (TP) and Stop Loss (SL) levels based on risk/reward ratios.
 *  - Optimizing strategy parameters.
 */

const optimizationManager = require('./optimization/OptimizationManager');

function calculatePositionSize(riskParams, balance, price) {
    if (riskParams.positionSizingMethod === 'compound') {
        // Compound: use current balance (which may have grown) and riskFraction.
        if (typeof riskParams.riskFraction === 'number') {
            const riskAmount = balance * riskParams.riskFraction;
            if (riskParams.stopLossDistance && riskParams.stopLossDistance > 0) {
                return riskAmount / (price * riskParams.stopLossDistance);
            } else {
                return riskAmount / price;
            }
        }
        // Fallback: 1% of balance.
        return (balance * 0.01) / price;
    } else if (riskParams.positionSizingMethod === 'simple') {
        // Simple: use a fixed fraction of the initial balance.
        if (riskParams.positionSizeType && riskParams.positionSizeValue) {
            if (riskParams.positionSizeType === 'percentage') {
                const percentage = riskParams.positionSizeValue / 100;
                return (balance * percentage) / price;
            }
            // If using fixed, return the fixed value.
            if (riskParams.positionSizeType === 'fixed') {
                return riskParams.positionSizeValue;
            }
        }
        // Fallback: 1% of balance.
        return (balance * 0.01) / price;
    }
    // Default fallback.
    return (balance * 0.01) / price;
}

function enforceRiskLimits(trades, riskParams, currentBalance) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todaysTrades = trades.filter(trade => new Date(trade.exitTime) >= startOfDay);
    let dailyLoss = 0;
    todaysTrades.forEach(trade => {
        if (trade.profit < 0) {
            dailyLoss += trade.profit;
        }
    });
    if (riskParams.maxDailyLoss && Math.abs(dailyLoss) >= riskParams.maxDailyLoss) {
        console.warn(`Daily loss of ${Math.abs(dailyLoss)} reached maxDailyLoss ${riskParams.maxDailyLoss}`);
        return false;
    }
    if (riskParams.minimumBalance && currentBalance < riskParams.minimumBalance) {
        console.warn(`Current balance ${currentBalance} is below minimum balance ${riskParams.minimumBalance}`);
        return false;
    }
    return true;
}

function calculateTPSL(params, entryPrice) {
    if (params && params.stopLossDistance && params.riskRewardRatio) {
        const stopLoss = entryPrice * (1 - params.stopLossDistance);
        const takeProfit = entryPrice * (1 + params.stopLossDistance * params.riskRewardRatio);
        return { TP: takeProfit, SL: stopLoss };
    }
    return {
        TP: entryPrice * 1.02,
        SL: entryPrice * 0.98
    };
}

/**
 * Optimizes strategy parameters using the specified optimization method.
 *
 * @param {String} symbol - Trading symbol.
 * @param {String} timeframe - Timeframe.
 * @param {String} optimizationMethod - The optimization method (e.g., "grid").
 * @param {Array} historicalCandles - Historical candle data.
 * @returns {Object} Optimized parameters.
 */
function optimizeParameters(symbol, timeframe, optimizationMethod, historicalCandles) {
    return optimizationManager.optimize(symbol, timeframe, optimizationMethod, historicalCandles);
}

module.exports = {
    calculatePositionSize,
    enforceRiskLimits,
    calculateTPSL,
    optimizeParameters,
};
