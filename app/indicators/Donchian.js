/**
 * calculateDonchianSignal
 *
 * This function generates trading signals based on the Donchian channel's middle band crossover.
 *
 * Assumptions:
 * - The input is an array of candle objects sorted in ascending order by timestamp.
 * - Each candle object has a `close` property and a middle band value stored in a property named `${indicatorName}_middle`.
 *
 * Signal Logic:
 * - BUY signal: current candle's close > current candle's middle band
 *   AND previous candle's close <= previous candle's middle band.
 * - SELL signal: current candle's close < current candle's middle band
 *   AND previous candle's close >= previous candle's middle band.
 * - Otherwise, the signal is 'HOLD'.
 *
 * @param {Array<Object>} candles - Array of candle objects.
 * @param {string} indicatorName - Name of the indicator (e.g., "donchian").
 * @returns {Array<string>} Array of signals for each candle.
 */
function calculateDonchianSignal(candles, indicatorName) {
    // Define the property name for the middle band.
    const middleField = `${indicatorName}_middle`;

    // Initialize an array of signals, defaulting to 'HOLD'
    const signals = new Array(candles.length).fill('HOLD');

    // Start from index 1 since we compare each candle to its previous one.
    for (let i = 1; i < candles.length; i++) {
        const currentClose = candles[i].close;
        const currentMiddle = candles[i][middleField];
        const prevClose = candles[i - 1].close;
        const prevMiddle = candles[i - 1][middleField];

        if (currentClose > currentMiddle && prevClose <= prevMiddle) {
            signals[i] = 'BUY';
        } else if (currentClose < currentMiddle && prevClose >= prevMiddle) {
            signals[i] = 'SELL';
        } else {
            signals[i] = 'HOLD';
        }
    }
    return signals;
}

module.exports = { calculateDonchianSignal };
