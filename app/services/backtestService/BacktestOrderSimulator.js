/**
 * BacktestOrderSimulator
 *
 * Simulates order execution during a backtest.
 * It opens trades on BUY signals and closes them on SELL signals, updating the balance.
 *
 * @param {Object} options - Contains current balance, currentPrice, currentTime, signal,
 *                             positionSize (calculated externally), and the current openPosition (if any).
 * @returns {Object} - Updated openPosition (or null if closed), updated balance, and optionally a trade record.
 */
function simulateOrder({ balance, currentPrice, currentTime, signal, openPosition, calculatePositionSize, calculateTPSL }) {
    let tradeRecord = null;

    // If signal is BUY and no open position exists.
    if (signal === 'BUY' && !openPosition) {
        // Calculate position size using the provided function.
        const quantity = calculatePositionSize(balance, currentPrice);
        // Compute TP/SL levels using the provided function.
        const { TP, SL } = calculateTPSL(currentPrice);
        // Create a new open position.
        openPosition = {
            entryPrice: currentPrice,
            sizeInBase: quantity,
            costInQuote: quantity * currentPrice,
            entryTime: currentTime,
            TP,
            SL
        };
        balance -= openPosition.costInQuote; // Deduct investment from balance.
    }
    // If signal is SELL and an open position exists.
    else if (signal === 'SELL' && openPosition) {
        const exitPrice = currentPrice;
        const positionValue = openPosition.sizeInBase * exitPrice;
        const profit = positionValue - openPosition.costInQuote;
        balance += positionValue; // Add proceeds to balance.
        // Create a trade record.
        tradeRecord = {
            entry: openPosition.entryPrice,
            exit: exitPrice,
            profit,
            entryTime: openPosition.entryTime,
            exitTime: currentTime,
            duration: currentTime - openPosition.entryTime,
            closedBy: 'SELL signal'
        };
        // Close the open position.
        openPosition = null;
    }
    // Otherwise, nothing happens.
    return { openPosition, balance, tradeRecord };
}

module.exports = { simulateOrder };
