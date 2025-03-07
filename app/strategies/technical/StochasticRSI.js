/**
 * calculateStochasticRSISignal
 *
 * This function generates trading signals based on the Stochastic RSI indicator.
 *
 * Assumptions:
 * - The input is an array of candle objects sorted in ascending order by timestamp.
 * - Each candle object contains:
 *    - a %K value stored in a property named `${indicatorName}_k`
 *    - a %D value stored in a property named `${indicatorName}_d`
 *
 * Signal Logic:
 * - BUY Signal: When the current candle’s %K is greater than its %D and the previous candle’s %K was less than or equal to its %D.
 * - SELL Signal: When the current candle’s %K is less than its %D and the previous candle’s %K was greater than or equal to its %D.
 * - Otherwise, the signal is 'HOLD'.
 *
 * @param {Array<Object>} candles - Array of candle objects.
 * @param {string} indicatorName - Base name for the Stochastic RSI fields (e.g., "stochrsi").
 * @returns {Array<string>} Array of signals corresponding to each candle.
 */
function calculateStochasticRSISignal(candles, indicatorName) {
    // Build the property names for the %K and %D values.
    const kField = `${indicatorName}_k`;
    const dField = `${indicatorName}_d`;

    // Initialize an array for signals with the default 'HOLD' value.
    const signals = new Array(candles.length).fill('HOLD');

    // Start looping from index 1 since we need the previous candle for comparison.
    for (let i = 1; i < candles.length; i++) {
        // Get current candle's %K and %D values.
        const kCurrent = candles[i][kField];
        const dCurrent = candles[i][dField];

        // Get previous candle's %K and %D values.
        const kPrevious = candles[i - 1][kField];
        const dPrevious = candles[i - 1][dField];

        // BUY condition:
        // Current %K > current %D AND previous %K <= previous %D.
        if (kCurrent > dCurrent && kPrevious <= dPrevious) {
            signals[i] = 'BUY';
        }
            // SELL condition:
        // Current %K < current %D AND previous %K >= previous %D.
        else if (kCurrent < dCurrent && kPrevious >= dPrevious) {
            signals[i] = 'SELL';
        }
        // Otherwise, the signal remains 'HOLD'.
        else {
            signals[i] = 'HOLD';
        }
    }

    return signals;
}

module.exports = { calculateStochasticRSISignal };
