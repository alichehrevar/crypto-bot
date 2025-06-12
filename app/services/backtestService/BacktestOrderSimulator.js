// app/services/backtestService/BacktestOrderSimulator.js

/**
 * simulateOrder
 *
 * Runs one tick of the order simulator:
 * 1) If signal is SELL and you have an open position, close it (signal‐based exit).
 * 2) Else if you have an open position and price >= TP or <= SL, close it (auto‐exit).
 * 3) Else if signal is BUY and you are flat, open a new position.
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

    // 1) SIGNAL‐BASED EXIT (SELL)
    if (signal === 'SELL' && openPosition) {
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
        return { openPosition, balance, tradeRecord };
    }

    // 2) AUTO EXIT (TP / SL)
    if (openPosition) {
        if (currentPrice >= openPosition.TP) {
            // TAKE‐PROFIT
            const exitPrice = openPosition.TP;
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
                closedBy:  'TP'
            };
            openPosition = null;
            return { openPosition, balance, tradeRecord };
        }
        if (currentPrice <= openPosition.SL) {
            // STOP‐LOSS
            const exitPrice = openPosition.SL;
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
                closedBy:  'SL'
            };
            openPosition = null;
            return { openPosition, balance, tradeRecord };
        }
    }

    // 3) SIGNAL‐BASED ENTRY (BUY)
    if (signal === 'BUY' && !openPosition) {
        const quantity = calculatePositionSize(balance, currentPrice);
        const { TP, SL } = calculateTPSL(currentPrice);
        openPosition = {
            entryPrice:  currentPrice,
            sizeInBase:  quantity,
            costInQuote: quantity * currentPrice,
            entryTime:   currentTime,
            TP,
            SL
        };
        balance -= openPosition.costInQuote;
        return { openPosition, balance, tradeRecord };
    }

    // 4) NO ACTION
    return { openPosition, balance, tradeRecord };
}

/**
 * closeFinal
 *
 * Final mark‐to‐market close if still open at end of backtest.
 */
function closeFinal(openPosition, lastPrice, lastTime) {
    if (!openPosition) {
        return { newBalance: 0, tradeRecord: null };
    }
    const value  = openPosition.sizeInBase * lastPrice;
    const profit = value - openPosition.costInQuote;
    return {
        newBalance: value,
        tradeRecord: {
            entry:     openPosition.entryPrice,
            exit:      lastPrice,
            profit,
            entryTime: openPosition.entryTime,
            exitTime:  lastTime,
            duration:  lastTime - openPosition.entryTime,
            closedBy:  'END'
        }
    };
}

module.exports = { simulateOrder, closeFinal };
