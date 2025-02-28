// indicators/CombinedRsiMacd.js

/**
 * calculateCombinedRsiMacdSignal
 *
 * This function generates trading signals (BUY, SELL, or HOLD) by combining RSI and MACD indicator crossovers.
 * It uses a "confirmation window" so that once a crossover is detected for one indicator, the signal is held
 * pending confirmation from the other indicator for a specified number of candles.
 *
 * @param {Array<Object>} candles - Array of candle objects (sorted in ascending order by timestamp).
 *   Each candle should have the following properties:
 *     - `${indicatorName}_rsi`: The RSI value.
 *     - `${indicatorName}_rsi_ma`: The moving average of RSI.
 *     - `${indicatorName}_macd_line`: The MACD line value.
 *     - `${indicatorName}_signal_line`: The MACD signal line value.
 * @param {string} indicatorName - Base name for the indicator columns (e.g., "combined" or "crsi_macd").
 * @param {Object} config - Configuration object. Should contain a parameter "confirmation_window" (e.g., 6).
 * @returns {Array<string>} An array of signals corresponding to each candle. (Default is "HOLD")
 */
function calculateCombinedRsiMacdSignal(candles, indicatorName, config) {
    // Define the column names for RSI, RSI moving average, MACD line, and MACD signal line.
    const rsiCol = `${indicatorName}_rsi`;
    const rsiMaCol = `${indicatorName}_rsi_ma`;
    const macdLineCol = `${indicatorName}_macd_line`;
    const signalLineCol = `${indicatorName}_signal_line`;

    // Confirmation window from config; default to 6 if not provided.
    const confirmationWindow = (config.parameters && config.parameters.confirmation_window) || 6;

    // Initialize an array for signals with default 'HOLD' values.
    const signals = new Array(candles.length).fill('HOLD');

    // Initialize pending signal counters for RSI and MACD.
    // These counters will be set to confirmationWindow when a crossover is detected and then decremented.
    let pendingRsiSignal = { BUY: 0, SELL: 0 };
    let pendingMacdSignal = { BUY: 0, SELL: 0 };

    // Loop over each candle. Start at index 1 because we need a previous candle for comparison.
    for (let i = 1; i < candles.length; i++) {
        // Extract current and previous values for RSI and its moving average.
        const rsiCurrent = candles[i][rsiCol];
        const rsiMaCurrent = candles[i][rsiMaCol];
        const macdLineCurrent = candles[i][macdLineCol];
        const signalLineCurrent = candles[i][signalLineCol];

        // Get previous candle values.
        const rsiPrevious = candles[i - 1][rsiCol];
        const rsiMaPrevious = candles[i - 1][rsiMaCol];
        const macdLinePrevious = candles[i - 1][macdLineCol];
        const signalLinePrevious = candles[i - 1][signalLineCol];

        // --- RSI Crossover Check ---
        // If previous RSI was less than or equal to its moving average and current RSI is above its moving average, mark a BUY.
        if (rsiPrevious <= rsiMaPrevious && rsiCurrent > rsiMaCurrent) {
            pendingRsiSignal.BUY = confirmationWindow;
        }
        // If previous RSI was greater than or equal to its moving average and current RSI is below its moving average, mark a SELL.
        else if (rsiPrevious >= rsiMaPrevious && rsiCurrent < rsiMaCurrent) {
            pendingRsiSignal.SELL = confirmationWindow;
        }

        // --- MACD Crossover Check ---
        // If previous MACD line was less than or equal to previous signal line and current MACD line is above current signal line, mark a BUY.
        if (macdLinePrevious <= signalLinePrevious && macdLineCurrent > signalLineCurrent) {
            pendingMacdSignal.BUY = confirmationWindow;
        }
        // If previous MACD line was greater than or equal to previous signal line and current MACD line is below current signal line, mark a SELL.
        else if (macdLinePrevious >= signalLinePrevious && macdLineCurrent < signalLineCurrent) {
            pendingMacdSignal.SELL = confirmationWindow;
        }

        // --- Combined Signal Check ---
        // If both RSI and MACD have a pending BUY signal, set final signal to 'BUY' for this candle and reset counters.
        if (pendingRsiSignal.BUY > 0 && pendingMacdSignal.BUY > 0) {
            signals[i] = 'BUY';
            pendingRsiSignal.BUY = 0;
            pendingMacdSignal.BUY = 0;
        }
        // Similarly, if both have a pending SELL signal, set final signal to 'SELL' for this candle and reset counters.
        else if (pendingRsiSignal.SELL > 0 && pendingMacdSignal.SELL > 0) {
            signals[i] = 'SELL';
            pendingRsiSignal.SELL = 0;
            pendingMacdSignal.SELL = 0;
        }

        // --- Decrement Pending Counters ---
        // Decrease the pending counters for RSI and MACD if they are above zero.
        if (pendingRsiSignal.BUY > 0) pendingRsiSignal.BUY -= 1;
        if (pendingRsiSignal.SELL > 0) pendingRsiSignal.SELL -= 1;
        if (pendingMacdSignal.BUY > 0) pendingMacdSignal.BUY -= 1;
        if (pendingMacdSignal.SELL > 0) pendingMacdSignal.SELL -= 1;
    }

    return signals;
}

module.exports = { calculateCombinedRsiMacdSignal };
