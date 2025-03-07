/**
 * calculateVolumeSignal
 *
 * This function generates trading signals (BUY, SELL, HOLD) based on volume changes relative
 * to a computed average volume. It assumes that each candle in the provided array contains:
 *   - a 'volume' property (current candle volume)
 *   - an average volume property under the key `${indicatorName}_avg_volume`
 *
 * Signal Generation:
 * - BUY Signal: If the current candle's volume is greater than 1.5 times its average volume,
 *   and the previous candle's volume was less than or equal to 1.5 times its average volume.
 * - SELL Signal: If the current candle's volume is less than 0.5 times its average volume,
 *   and the previous candle's volume was greater than or equal to 0.5 times its average volume.
 * - Otherwise, the signal is HOLD.
 *
 * @param {Array<Object>} candles - Array of candle objects sorted in ascending order by time.
 * @param {string} indicatorName - Name of the indicator (e.g., "volume").
 * @returns {Array<string>} Array of signals for each candle.
 */
function calculateVolumeSignal(candles, indicatorName) {
    // Construct the property name for the average volume.
    const avgVolField = `${indicatorName}_avg_volume`;

    // Initialize the signals array with 'HOLD' as the default value for each candle.
    const signals = new Array(candles.length).fill('HOLD');

    // Start processing from the second candle since we need to compare each candle with its previous one.
    for (let i = 1; i < candles.length; i++) {
        // Retrieve the current candle's volume and its average volume.
        const currentVolume = candles[i].volume;
        const avgVolume = candles[i][avgVolField];

        // Retrieve the previous candle's volume and its average volume.
        const prevVolume = candles[i - 1].volume;
        const prevAvgVolume = candles[i - 1][avgVolField];

        // Check for a BUY signal:
        // If the current volume exceeds 1.5 times the current average volume AND
        // the previous volume was less than or equal to 1.5 times the previous average volume.
        if (currentVolume > avgVolume * 1.5 && prevVolume <= prevAvgVolume * 1.5) {
            signals[i] = 'BUY';
        }
            // Check for a SELL signal:
            // If the current volume is less than 0.5 times the current average volume AND
        // the previous volume was greater than or equal to 0.5 times the previous average volume.
        else if (currentVolume < avgVolume * 0.5 && prevVolume >= prevAvgVolume * 0.5) {
            signals[i] = 'SELL';
        }
        // Otherwise, the signal remains as 'HOLD'.
        else {
            signals[i] = 'HOLD';
        }
    }

    return signals;
}

module.exports = { calculateVolumeSignal };
