// app/services/backtestService/BacktestOrderSimulator.js

/**
 * simulateOrder
 */
async function simulateOrder({
                                 balance,
                                 currentPrice,
                                 currentTime,
                                 signal,
                                 openPosition,
                                 calculatePositionSize,
                                 calculateTPSL
                             }) {
    let tradeRecord = null;

    // BUY → open a new position
    if (signal === 'BUY' && !openPosition) {
        const quantity = calculatePositionSize(balance, currentPrice);
        const { TP, SL } = calculateTPSL(currentPrice);
        openPosition = {
            entryPrice:   currentPrice,
            sizeInBase:   quantity,
            costInQuote:  quantity * currentPrice,
            entryTime:    currentTime,
            TP,
            SL
        };
        balance -= openPosition.costInQuote;
    }
    // SELL → close existing position
    else if (signal === 'SELL' && openPosition) {
        const exitPrice = currentPrice;
        const value     = openPosition.sizeInBase * exitPrice;
        const profit    = value - openPosition.costInQuote;
        balance += value;
        tradeRecord = {
            entry:     openPosition.entryPrice,
            exit:      exitPrice,
            profit,
            entryTime: openPosition.entryTime,
            exitTime:  currentTime,
            duration:  currentTime - openPosition.entryTime,
            closedBy:  'SELL'
        };
        openPosition = null;
    }

    return { openPosition, balance, tradeRecord };
}

/**
 * closeFinal
 *
 * Final mark-to-market close if still open at end of backtest.
 */
function closeFinal(openPosition, lastPrice, lastTime) {
    let tradeRecord = null;
    let balance     = 0;
    if (openPosition) {
        const value  = openPosition.sizeInBase * lastPrice;
        const profit = value - openPosition.costInQuote;
        balance = value; // add to whatever remains
        tradeRecord = {
            entry:     openPosition.entryPrice,
            exit:      lastPrice,
            profit,
            entryTime: openPosition.entryTime,
            exitTime:  lastTime,
            duration:  lastTime - openPosition.entryTime,
            closedBy:  'END'
        };
    }
    return { newBalance: balance, tradeRecord };
}

module.exports = { simulateOrder, closeFinal };
