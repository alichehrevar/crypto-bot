/**
 * Enforces risk limits based on the provided risk parameters and current balance.
 * @param {Array} trades - Array of closed trade objects.
 * @param {Object} riskParams - Risk parameters (maxDailyLoss, minimumBalance, etc.).
 * @param {Number} currentBalance - Current simulated balance.
 * @returns {Boolean} True if risk limits allow further trading.
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
 * Calculates the position size based on the risk strategy.
 * Uses 'compound' or 'simple' method as specified.
 * @param {Object} riskParams - Contains positionSizingMethod, riskFraction, positionSizeType, positionSizeValue, etc.
 * @param {Number} balance - Current balance.
 * @param {Number} price - Current price.
 * @returns {Number} The calculated position size.
 */
function calculatePositionSize(riskParams, balance, price) {
    if (riskParams.positionSizingMethod === 'compound') {
        if (typeof riskParams.riskFraction === 'number') {
            const riskAmount = balance * riskParams.riskFraction;
            if (riskParams.stopLossDistance && riskParams.stopLossDistance > 0) {
                return riskAmount / (price * riskParams.stopLossDistance);
            }
            return riskAmount / price;
        }
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
 * Calculates Take Profit (TP) and Stop Loss (SL) levels.
 * @param {Object} params - Should contain stopLossDistance and riskRewardRatio.
 * @param {Number} entryPrice - The entry price.
 * @returns {Object} { TP, SL }
 */
function calculateTPSL(params, entryPrice) {
    if (params && params.stopLossDistance && params.riskRewardRatio) {
        const stopLoss = entryPrice * (1 - params.stopLossDistance);
        const takeProfit = entryPrice * (1 + params.stopLossDistance * params.riskRewardRatio);
        return { TP: takeProfit, SL: stopLoss };
    }
    return { TP: entryPrice * 1.02, SL: entryPrice * 0.98 };
}

module.exports = {
    enforceRiskLimits,
    calculatePositionSize,
    calculateTPSL,
};
