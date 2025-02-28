/**
 * calculateBollingerBandsSignal
 *
 * This function generates BUY/SELL/HOLD signals based on Bollinger Bands crossover logic.
 *
 * Assumptions:
 * - The input is an array of candle objects sorted in ascending order by timestamp.
 * - Each candle object contains:
 *     - 'close': the closing price.
 *     - A basis value stored in a property named `${indicatorName}_basis`.
 *     - Upper and lower bands stored in properties `${indicatorName}_upper1` and `${indicatorName}_lower1`.
 *
 * Signal Logic:
 * - BUY Signal: When the current candle's close price crosses above the lower1 band,
 *   and the previous candle's close was at or below its lower1 band.
 * - SELL Signal: When the current candle's close price crosses below the upper1 band,
 *   and the previous candle's close was at or above its upper1 band.
 * - Otherwise, the signal is 'HOLD'.
 *
 * @param {Array<Object>} candles - Array of candle objects.
 * @param {string} indicatorName - Base name for Bollinger Bands indicator (e.g., "bollinger").
 * @returns {Array<string>} Array of signals for each candle.
 */
function calculateBollingerBandsSignal(candles, indicatorName) {
    // Construct the property names for the Bollinger Bands components.
    const basisField = `${indicatorName}_basis`;
    const upper1Field = `${indicatorName}_upper1`;
    const lower1Field = `${indicatorName}_lower1`;
    // (Optional: Upper2 and Lower2 can be used for extended logic)
    // const upper2Field = `${indicatorName}_upper2`;
    // const lower2Field = `${indicatorName}_lower2`;

    // Initialize an array for signals with a default value 'HOLD' for each candle.
    const signals = new Array(candles.length).fill('HOLD');

    // Start from index 1 because we compare the current candle with the previous one.
    for (let i = 1; i < candles.length; i++) {
        // Get the current candle's close price.
        const currentClose = candles[i].close;
        // Retrieve the current candle's lower1 and upper1 values.
        const currentLower1 = candles[i][lower1Field];
        const currentUpper1 = candles[i][upper1Field];

        // Get the previous candle's close price.
        const prevClose = candles[i - 1].close;
        // Retrieve the previous candle's lower1 and upper1 values.
        const prevLower1 = candles[i - 1][lower1Field];
        const prevUpper1 = candles[i - 1][upper1Field];

        // Generate BUY signal:
        // If current close is above the current lower1 band, and the previous close was at or below the previous lower1.
        if (currentClose > currentLower1 && prevClose <= prevLower1) {
            signals[i] = 'BUY';
        }
            // Generate SELL signal:
        // If current close is below the current upper1 band, and the previous close was at or above the previous upper1.
        else if (currentClose < currentUpper1 && prevClose >= prevUpper1) {
            signals[i] = 'SELL';
        }
        // Otherwise, the signal remains 'HOLD'
        else {
            signals[i] = 'HOLD';
        }
    }

    return signals;
}

module.exports = { calculateBollingerBandsSignal };
