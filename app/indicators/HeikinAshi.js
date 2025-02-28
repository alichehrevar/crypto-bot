// indicators/HeikinAshi.js

/**
 * calculateHeikinAshiSignal
 *
 * This function generates trading signals based on Heikin-Ashi candles.
 * It assumes that each candle object contains:
 *   - A Heikin-Ashi open value stored in a field named `${indicatorName}_ha_open`
 *   - A Heikin-Ashi close value stored in a field named `${indicatorName}_ha_close`
 *
 * Signal Generation Logic:
 * - A BUY signal is generated when the current candle's Heikin-Ashi close is above its Heikin-Ashi open,
 *   and the previous candle's Heikin-Ashi close was at or below its Heikin-Ashi open.
 * - A SELL signal is generated when the current candle's Heikin-Ashi close is below its Heikin-Ashi open,
 *   and the previous candle's Heikin-Ashi close was at or above its Heikin-Ashi open.
 * - Otherwise, the signal remains 'HOLD'.
 *
 * @param {Array<Object>} candles - Array of candle objects, sorted in ascending order by timestamp.
 * @param {string} indicatorName - The base name for the Heikin-Ashi fields (e.g., "heikinashi").
 * @returns {Array<string>} An array of signals, one for each candle.
 */
function calculateHeikinAshiSignal(candles, indicatorName) {
    // Construct the field names for the Heikin-Ashi open and close values.
    const haOpenField = `${indicatorName}_ha_open`;
    const haCloseField = `${indicatorName}_ha_close`;

    // Initialize the signals array with "HOLD" for all candles.
    const signals = new Array(candles.length).fill('HOLD');

    // We start from the second candle since the first candle doesn't have a previous candle to compare.
    for (let i = 1; i < candles.length; i++) {
        // Retrieve the current candle's Heikin-Ashi open and close values.
        const currentHaOpen = candles[i][haOpenField];
        const currentHaClose = candles[i][haCloseField];

        // Retrieve the previous candle's Heikin-Ashi open and close values.
        const prevHaOpen = candles[i - 1][haOpenField];
        const prevHaClose = candles[i - 1][haCloseField];

        // Check for a BUY signal:
        // Current candle's Heikin-Ashi close is above its open AND previous candle's Heikin-Ashi close was at or below its open.
        if (currentHaClose > currentHaOpen && prevHaClose <= prevHaOpen) {
            signals[i] = 'BUY';
        }
            // Check for a SELL signal:
        // Current candle's Heikin-Ashi close is below its open AND previous candle's Heikin-Ashi close was at or above its open.
        else if (currentHaClose < currentHaOpen && prevHaClose >= prevHaOpen) {
            signals[i] = 'SELL';
        }
        // Otherwise, the signal remains as 'HOLD'.
        else {
            signals[i] = 'HOLD';
        }
    }

    return signals;
}

module.exports = { calculateHeikinAshiSignal };
