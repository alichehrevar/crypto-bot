// services/backtestService/BacktestRiskManager.js

// Import the OptimizationManager to handle parameter optimization.
const OptimizationManager = require('../../strategies/optimization/OptimizationManager');

/**
 * calculatePositionSize
 *
 * Calculates the number of units to trade based on risk parameters.
 * This function supports two methods: "compound" and "simple".
 *
 * Compound method:
 * - Uses a riskFraction (a percentage of the current balance you're willing to risk).
 *   For example, with a balance of $10,000 and a riskFraction of 0.02 (2%), the riskAmount is $200.
 * - If a stopLossDistance is provided (e.g., 0.02 for 2%), then the loss per unit is computed as (price * stopLossDistance).
 *   The position size is then calculated as:
 *       positionSize = riskAmount / (price * stopLossDistance)
 *   This ensures that if the price drops by the stopLossDistance, the total loss will be approximately riskAmount.
 * - If stopLossDistance is not provided, it simply divides the riskAmount by the price.
 * - If riskFraction is missing, it defaults to risking 1% of the balance.
 *
 * Simple method:
 * - Uses a fixed sizing approach. If positionSizeType is "percentage", it computes the trade size as a fixed
 *   percentage of the balance. If it's "fixed", it returns a fixed number of units.
 *
 * @param {Object} riskParams - The risk management parameters.
 *   Expected properties:
 *     - positionSizingMethod: 'compound' or 'simple'
 *     - For compound: riskFraction (e.g., 0.02) and stopLossDistance (e.g., 0.02)
 *     - For simple: positionSizeType ('percentage' or 'fixed') and positionSizeValue.
 *     - maxOpenTrades, etc.
 * @param {Number} balance - The current account balance.
 * @param {Number} price - The current market price.
 * @returns {Number} The computed trade size (number of units).
 */
function calculatePositionSize(riskParams, balance, price) {
    if (riskParams.positionSizingMethod === 'compound') {
        // Ensure riskFraction is provided and is a number.
        if (typeof riskParams.riskFraction === 'number') {
            // Calculate the dollar amount you're willing to risk.
            // For instance, with a balance of $10,000 and a riskFraction of 0.02, riskAmount is $200.
            const riskAmount = balance * riskParams.riskFraction;

            // If stopLossDistance is defined and valid, determine the number of units such that the loss per unit
            // (price * stopLossDistance) multiplied by the number of units equals riskAmount.
            if (riskParams.stopLossDistance && riskParams.stopLossDistance > 0) {
                return riskAmount / (price * riskParams.stopLossDistance);
            }

            // If no stopLossDistance is provided, simply divide riskAmount by price.
            return riskAmount / price;
        }
        // Fallback: if no riskFraction is provided, default to risking 1% of balance.
        return (balance * 0.01) / price;
    } else if (riskParams.positionSizingMethod === 'simple') {
        // For the simple method, use the provided fixed parameters.
        if (riskParams.positionSizeType && riskParams.positionSizeValue) {
            if (riskParams.positionSizeType === 'percentage') {
                const percentage = riskParams.positionSizeValue / 100;
                return (balance * percentage) / price;
            }
            if (riskParams.positionSizeType === 'fixed') {
                return riskParams.positionSizeValue;
            }
        }
        // Fallback: default to 1% of balance.
        return (balance * 0.01) / price;
    }
    // General fallback.
    return (balance * 0.01) / price;
}

/**
 * enforceRiskLimits
 *
 * Checks whether trading can continue by enforcing risk limits:
 * - It checks if the cumulative loss for today's trades exceeds the maximum daily loss allowed.
 * - It checks if the current balance is below a minimum required balance.
 *
 * @param {Array} trades - Array of trade objects (each with exitTime and profit).
 * @param {Object} riskParams - Risk parameters (e.g., maxDailyLoss, minimumBalance).
 * @param {Number} currentBalance - The current account balance.
 * @returns {Boolean} True if trading is allowed; false otherwise.
 */
function enforceRiskLimits(trades, riskParams, currentBalance) {
    const now = new Date();
    // Define start of the day (midnight)
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // Filter trades closed today.
    const todaysTrades = trades.filter(trade => new Date(trade.exitTime) >= startOfDay);
    let dailyLoss = 0;
    todaysTrades.forEach(trade => {
        if (trade.profit < 0) dailyLoss += trade.profit;
    });
    // Check if the absolute loss meets or exceeds maxDailyLoss.
    if (riskParams.maxDailyLoss && Math.abs(dailyLoss) >= riskParams.maxDailyLoss) {
        console.warn(`Daily loss of ${Math.abs(dailyLoss)} reached maxDailyLoss ${riskParams.maxDailyLoss}`);
        return false;
    }
    // Check if the current balance is below the minimum balance requirement.
    if (riskParams.minimumBalance && currentBalance < riskParams.minimumBalance) {
        console.warn(`Current balance ${currentBalance} is below minimum balance ${riskParams.minimumBalance}`);
        return false;
    }
    return true;
}

/**
 * calculateTPSL
 *
 * Calculates the Take Profit (TP) and Stop Loss (SL) levels based on the entry price,
 * a given stop loss distance, and a risk/reward ratio.
 *
 * @param {Object} params - Parameters containing stopLossDistance and riskRewardRatio.
 * @param {Number} entryPrice - The entry price of the trade.
 * @returns {Object} An object with TP (take profit) and SL (stop loss) values.
 */
function calculateTPSL(params, entryPrice) {
    if (params && params.stopLossDistance && params.riskRewardRatio) {
        const stopLoss = entryPrice * (1 - params.stopLossDistance);
        const takeProfit = entryPrice * (1 + params.stopLossDistance * params.riskRewardRatio);
        return { TP: takeProfit, SL: stopLoss };
    }
    // Default TP/SL levels if parameters are missing.
    return { TP: entryPrice * 1.02, SL: entryPrice * 0.98 };
}

/**
 * optimizeParameters
 *
 * Optimizes strategy parameters using a specified optimization method.
 * Delegates the optimization process to the OptimizationManager.
 *
 * @param {String} symbol - Trading symbol (e.g., "BTC/USDT").
 * @param {String} timeframe - Trading timeframe (e.g., "1h").
 * @param {String} optimizationMethod - The optimization method (e.g., "grid").
 * @param {Array} historicalCandles - Array of historical candle data.
 * @returns {Object} An object containing the optimized parameters.
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
