/**
 * Simulates order execution based on a signal.
 * @param {String} signal - 'BUY' or 'SELL'.
 * @param {Number} currentPrice - The price at the current candle.
 * @param {Date} currentTime - The timestamp of the current candle.
 * @param {Object|null} openPosition - The currently open position (if any).
 * @param {Number} balance - Current balance.
 * @param {Object} riskParams - Risk parameters (used for TP/SL and sizing).
 * @returns {Object} { newOpenPosition, balance, tradeResult }.
 */
async function simulateOrder(signal, currentPrice, currentTime, openPosition, balance, riskParams) {
    let newOpenPosition = openPosition;
    let tradeResult = null;

    if (signal === 'BUY') {
        if (!openPosition) {
            // For simulation, we calculate a quantity.
            const quantity = (balance * 0.01) / currentPrice;
            let TP = currentPrice * 1.02, SL = currentPrice * 0.98;
            if (riskParams && riskParams.stopLossDistance && riskParams.riskRewardRatio) {
                SL = currentPrice * (1 - riskParams.stopLossDistance);
                TP = currentPrice * (1 + riskParams.stopLossDistance * riskParams.riskRewardRatio);
            }
            newOpenPosition = {
                entryPrice: currentPrice,
                sizeInBase: quantity,
                costInQuote: quantity * currentPrice,
                entryTime: currentTime,
                TP,
                SL,
            };
            balance -= newOpenPosition.costInQuote;
            console.log(`Simulated BUY at ${currentPrice}, quantity: ${quantity}, TP: ${TP}, SL: ${SL}`);
        }
    } else if (signal === 'SELL') {
        if (openPosition) {
            const exitPrice = currentPrice;
            const positionValue = openPosition.sizeInBase * exitPrice;
            const profit = positionValue - openPosition.costInQuote;
            balance += positionValue;
            tradeResult = {
                entry: openPosition.entryPrice,
                exit: exitPrice,
                profit,
                entryTime: openPosition.entryTime,
                exitTime: currentTime,
                duration: currentTime - openPosition.entryTime,
                closedBy: 'SELL signal',
            };
            console.log(`Simulated SELL at ${currentPrice}, profit: ${profit}`);
            newOpenPosition = null;
        }
    }

    return { newOpenPosition, balance, tradeResult };
}

module.exports = { simulateOrder };
