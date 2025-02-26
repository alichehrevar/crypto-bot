/**
 * RiskManagement.js
 *
 * This module implements risk functions for:
 *  - Calculating position size using either a risk fraction (compound) or fixed/percentage (simple) method.
 *  - Enforcing risk limits (e.g., maximum daily loss, minimum balance).
 *  - Calculating Take Profit (TP) and Stop Loss (SL) levels based on risk/reward ratios.
 *  - Optimizing strategy parameters via various methods.
 */

const OptimizationManager = require('./optimization/OptimizationManager');

function calculatePositionSize(riskParams, balance, price) {
    if (riskParams.positionSizingMethod === 'compound') {
        // Check that the riskFraction is provided and is a number.
        if (typeof riskParams.riskFraction === 'number') {
            // Calculate the dollar amount you're willing to risk.
            // For example, if balance is $10,000 and riskFraction is 0.02 (2%), then riskAmount is $200.
            const riskAmount = balance * riskParams.riskFraction;

            // Check if a stop loss distance is defined and is greater than zero.
            // The stopLossDistance represents the fraction of the price that determines the loss per unit.
            // For instance, if price is $100 and stopLossDistance is 0.02, the loss per unit is $2.
            if (riskParams.stopLossDistance && riskParams.stopLossDistance > 0) {

                // Determine the number of units you can buy such that if the price drops by the stop loss distance,
                // your loss per unit (price * stopLossDistance) times the number of units equals the riskAmount.
                return riskAmount / (price * riskParams.stopLossDistance);
            }

            // If no stopLossDistance is provided, simply divide the riskAmount by the price.
            // This means you'll buy enough units so that a full loss of the price equals the riskAmount.
            return riskAmount / price;
        }

        // Fallback: if no riskFraction is provided, default to risking 1% of the balance.
        return (balance * 0.01) / price;
    } else if (riskParams.positionSizingMethod === 'simple') {
        // Use fixed percentage or fixed value.
        if (riskParams.positionSizeType && riskParams.positionSizeValue) {
            if (riskParams.positionSizeType === 'percentage') {
                const percentage = riskParams.positionSizeValue / 100;
                return (balance * percentage) / price;
            }
            if (riskParams.positionSizeType === 'fixed') {
                return riskParams.positionSizeValue;
            }
        }
        return (balance * 0.01) / price;
    }
    return (balance * 0.01) / price;
}

function enforceRiskLimits(trades, riskParams, currentBalance) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todaysTrades = trades.filter(trade => new Date(trade.exitTime) >= startOfDay);
    let dailyLoss = 0;
    todaysTrades.forEach(trade => {
        if (trade.profit < 0) dailyLoss += trade.profit;
    });
    if (riskParams.maxDailyLoss && Math.abs(dailyLoss) >= riskParams.maxDailyLoss) {
        console.warn(`Daily loss ${Math.abs(dailyLoss)} reached maxDailyLoss ${riskParams.maxDailyLoss}`);
        return false;
    }
    if (riskParams.minimumBalance && currentBalance < riskParams.minimumBalance) {
        console.warn(`Current balance ${currentBalance} below minimum balance ${riskParams.minimumBalance}`);
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
    return { TP: entryPrice * 1.02, SL: entryPrice * 0.98 };
}

/**
 * Optimizes strategy parameters using the specified method.
 *
 * @param {String} symbol - Trading symbol.
 * @param {String} timeframe - Timeframe.
 * @param {String} optimizationMethod - The optimization method (e.g., "grid").
 * @param {Array} historicalCandles - Historical candle data.
 * @returns {Object} Optimized parameters.
 */
function optimizeParameters(symbol, timeframe, optimizationMethod, historicalCandles) {
    return OptimizationManager.optimize(symbol, timeframe, optimizationMethod, historicalCandles);
}

module.exports = {
    calculatePositionSize,
    enforceRiskLimits,
    calculateTPSL,
    optimizeParameters,
};
