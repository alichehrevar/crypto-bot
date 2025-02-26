const OptimizationManager = require('../../strategies/optimization/OptimizationManager');

/**
 * Calculates the position size for a trade.
 * Uses "compound" (using current balance and a riskFraction) or "simple" (fixed fraction) method.
 *
 * @param {Object} riskParams - Contains: positionSizingMethod ('compound' or 'simple'),
 *                                riskFraction, positionSizeType, positionSizeValue, stopLossDistance, etc.
 * @param {Number} balance - Current account balance.
 * @param {Number} price - Current market price.
 * @returns {Number} The computed position size.
 */
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

/**
 * Enforces risk limits by checking if the cumulative loss for today exceeds maxDailyLoss
 * or if the current balance is below a minimum required balance.
 *
 * @param {Array} trades - Array of trade objects.
 * @param {Object} riskParams - Risk parameters (maxDailyLoss, minimumBalance, etc.).
 * @param {Number} currentBalance - The current account balance.
 * @returns {Boolean} True if trading is allowed; false otherwise.
 */
function enforceRiskLimits(trades, riskParams, currentBalance) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todaysTrades = trades.filter(trade => new Date(trade.exitTime) >= startOfDay);
    let dailyLoss = 0;
    todaysTrades.forEach(trade => {
        if (trade.profit < 0) dailyLoss += trade.profit;
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

/**
 * Calculates the Take Profit (TP) and Stop Loss (SL) levels based on the entry price,
 * a stop loss distance, and a risk/reward ratio.
 *
 * @param {Object} params - Should include stopLossDistance and riskRewardRatio.
 * @param {Number} entryPrice - The trade entry price.
 * @returns {Object} An object with TP and SL values.
 */
function calculateTPSL(params, entryPrice) {
    if (params && params.stopLossDistance && params.riskRewardRatio) {
        const stopLoss = entryPrice * (1 - params.stopLossDistance);
        const takeProfit = entryPrice * (1 + params.stopLossDistance * params.riskRewardRatio);
        return { TP: takeProfit, SL: stopLoss };
    }
    return { TP: entryPrice * 1.02, SL: entryPrice * 0.98 };
}

/**
 * Optimizes strategy parameters using a specified method.
 * Currently, it delegates to the OptimizationManager which supports grid search.
 *
 * @param {String} symbol - Trading symbol (e.g., "BTC/USDT").
 * @param {String} timeframe - Timeframe (e.g., "1h").
 * @param {String} optimizationMethod - The optimization method to use (e.g., "grid").
 * @param {Array} historicalCandles - Array of historical candle data.
 * @returns {Object} An object containing optimized parameters.
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
