/**
 * RiskManagement.js
 *
 * This module provides unified risk management functions including:
 * - calculatePositionSize: Determines how many units to trade.
 * - enforceRiskLimits: Checks if risk limits (e.g., daily loss, minimum balance) allow a trade.
 * - calculateTPSL: Computes take profit (TP) and stop loss (SL) levels.
 * - optimizeParameters: Optimizes parameters using an external optimization manager.
 */

const OptimizationManager = require('./optimization/OptimizationManager');

/**
 * Calculates the position size for a trade.
 *
 * For the 'compound' method:
 * - The function uses a riskFraction which indicates the fraction of the current balance you're willing to risk.
 *   For example, a riskFraction of 0.02 means 2% of the balance.
 * - The risk amount is computed as (balance * riskFraction).
 * - If a stopLossDistance is provided, the loss per unit is estimated as (price * stopLossDistance).
 *   Dividing the riskAmount by this loss per unit gives the number of units that would cause a loss equal to the riskAmount.
 * - If stopLossDistance is not provided, it simply divides the riskAmount by the price.
 *
 * For the 'simple' method:
 * - It uses a fixed percentage or fixed value (based on riskParams.positionSizeType)
 *   to compute the trade size.
 *
 * @param {Object} riskParams - Contains fields:
 *   - positionSizingMethod: 'compound' or 'simple'
 *   - For compound: riskFraction (e.g., 0.02 for 2%), stopLossDistance (fraction, e.g., 0.02 for 2%)
 *   - For simple: positionSizeType ('percentage' or 'fixed') and positionSizeValue
 * @param {Number} balance - The current account balance.
 * @param {Number} price - The current market price.
 * @returns {Number} The calculated position size (number of units to trade).
 */
function calculatePositionSize(riskParams, balance, price) {
    // Compound Method: The trade size is adjusted based on the current balance.
    if (riskParams.positionSizingMethod === 'compound') {
        // Check if a risk fraction is provided.
        if (typeof riskParams.riskFraction === 'number') {
            // Calculate the dollar amount you're willing to risk on this trade.
            // For example, if balance = $10,000 and riskFraction = 0.02, riskAmount = $200.
            const riskAmount = balance * riskParams.riskFraction;

            // If a stop loss distance is provided and greater than zero,
            // calculate the loss per unit as price * stopLossDistance.
            // For example, if price = $100 and stopLossDistance = 0.02, loss per unit = $2.
            // Dividing riskAmount by this loss per unit gives the number of units you can buy.
            if (riskParams.stopLossDistance && riskParams.stopLossDistance > 0) {
                return riskAmount / (price * riskParams.stopLossDistance);
            }
            // If no stop loss distance is provided, fallback to simply dividing riskAmount by price.
            return riskAmount / price;
        }
        // If riskFraction is not provided, default to risking 1% of the balance.
        return (balance * 0.01) / price;
    }
    // Simple Method: Use fixed percentage or fixed value.
    else if (riskParams.positionSizingMethod === 'simple') {
        if (riskParams.positionSizeType && riskParams.positionSizeValue) {
            // If using a percentage, convert the value to a decimal and apply to balance.
            if (riskParams.positionSizeType === 'percentage') {
                const percentage = riskParams.positionSizeValue / 100;
                return (balance * percentage) / price;
            }
            // If using a fixed value, return that fixed number.
            if (riskParams.positionSizeType === 'fixed') {
                return riskParams.positionSizeValue;
            }
        }
        // Fallback to risking 1% of the balance.
        return (balance * 0.01) / price;
    }
    // Default: If no method is specified, default to risking 1% of the balance.
    return (balance * 0.01) / price;
}

/**
 * Enforces risk limits by checking whether:
 * - The cumulative loss for today's trades exceeds a maximum daily loss.
 * - The current balance is above a defined minimum balance.
 *
 * @param {Array} trades - Array of trade objects that have an exitTime and profit.
 * @param {Object} riskParams - Risk parameters (e.g., maxDailyLoss, minimumBalance).
 * @param {Number} currentBalance - The current account balance.
 * @returns {Boolean} True if trading is allowed, false otherwise.
 */
function enforceRiskLimits(trades, riskParams, currentBalance) {
    const now = new Date();
    // Set the start of the day (midnight).
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // Filter trades that closed today.
    const todaysTrades = trades.filter(trade => new Date(trade.exitTime) >= startOfDay);
    let dailyLoss = 0;
    todaysTrades.forEach(trade => {
        if (trade.profit < 0) {
            dailyLoss += trade.profit;
        }
    });
    // If the absolute daily loss exceeds maxDailyLoss, trading is not allowed.
    if (riskParams.maxDailyLoss && Math.abs(dailyLoss) >= riskParams.maxDailyLoss) {
        console.warn(`Daily loss of ${Math.abs(dailyLoss)} reached maxDailyLoss ${riskParams.maxDailyLoss}`);
        return false;
    }
    // If the current balance is below the minimum required balance, stop trading.
    if (riskParams.minimumBalance && currentBalance < riskParams.minimumBalance) {
        console.warn(`Current balance ${currentBalance} is below minimum balance ${riskParams.minimumBalance}`);
        return false;
    }
    return true;
}

/**
 * Calculates Take Profit (TP) and Stop Loss (SL) levels based on the entry price.
 * It uses a stopLossDistance and riskRewardRatio from the parameters.
 *
 * @param {Object} params - Parameters that should include stopLossDistance and riskRewardRatio.
 * @param {Number} entryPrice - The price at which the trade is entered.
 * @returns {Object} An object containing TP and SL.
 */
function calculateTPSL(params, entryPrice) {
    if (params && params.stopLossDistance && params.riskRewardRatio) {
        // Calculate stop loss level: a fraction below the entry price.
        const stopLoss = entryPrice * (1 - params.stopLossDistance);
        // Calculate take profit level: a fraction above the entry price based on risk-reward ratio.
        const takeProfit = entryPrice * (1 + params.stopLossDistance * params.riskRewardRatio);
        return { TP: takeProfit, SL: stopLoss };
    }
    // Default TP/SL: 2% above and below the entry price.
    return { TP: entryPrice * 1.02, SL: entryPrice * 0.98 };
}

/**
 * Optimizes strategy parameters using the specified optimization method.
 * Delegates to the OptimizationManager which supports grid search (and can be expanded).
 *
 * @param {String} symbol - Trading symbol (e.g., "BTC/USDT").
 * @param {String} timeframe - Timeframe (e.g., "1h").
 * @param {String} optimizationMethod - The optimization method to use (e.g., "grid").
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
