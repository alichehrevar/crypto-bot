// Import indicator classes from the indicators index.
const {
    RSI,
    MACD,
    MACrossover,
    Donchian,
    Volume,
    HeikinAshi,
    CombinedRsiMacd,
    BollingerBands,
    StochasticRSI
} = require('../../indicators');

/**
 * processSignal
 *
 * Processes historical candle data to generate a trading signal using the specified indicator.
 *
 * @param {Array<Object>} candles - Array of historical candle objects, sorted in ascending order.
 * @param {String} indicator - The name of the indicator to use.
 *        Supported values: 'RSI', 'MACD', 'MA_Crossover', 'Donchian', 'Volume',
 *                          'Heikin_Ashi', 'Combined_RSI_MACD', 'Bollinger_Bands', 'Stochastic_RSI'
 * @param {Object} strategyParams - Configuration parameters for the chosen indicator.
 * @returns {String} - The generated trading signal ('BUY', 'SELL', or 'HOLD').
 */
function processSignal(candles, indicator, strategyParams) {
    let signal = 'HOLD';
    try {
        switch (indicator) {
            case 'RSI': {
                const rsiInstance = new RSI(strategyParams);
                signal = rsiInstance.calculateSignal(candles);
                break;
            }
            case 'MACD': {
                const macdInstance = new MACD(strategyParams);
                signal = macdInstance.calculateSignal(candles);
                break;
            }
            case 'MA_Crossover': {
                const maCrossoverInstance = new MACrossover(strategyParams);
                signal = maCrossoverInstance.calculateSignal(candles);
                break;
            }
            case 'Donchian': {
                // For functions implemented as standalone functions, wrap them in an object with a calculateSignal method.
                signal = Donchian.calculateDonchianSignal(candles, 'donchian');
                break;
            }
            case 'Volume': {
                signal = Volume.calculateVolumeSignal(candles, 'volume');
                break;
            }
            case 'Heikin_Ashi': {
                signal = HeikinAshi.calculateHeikinAshiSignal(candles, 'heikinashi');
                break;
            }
            case 'Combined_RSI_MACD': {
                // Here, we pass a configuration object with a confirmation window.
                signal = CombinedRsiMacd.calculateCombinedRsiMacdSignal(candles, 'combined', { parameters: { confirmation_window: 6 } });
                break;
            }
            case 'Bollinger_Bands': {
                signal = BollingerBands.calculateBollingerBandsSignal(candles, 'bollinger');
                break;
            }
            case 'Stochastic_RSI': {
                // Assuming StochasticRSI is implemented as a class.
                const stochRsiInstance = new StochasticRSI(strategyParams);
                signal = stochRsiInstance.calculateSignal(candles);
                break;
            }
            default:
                console.error(`Unknown indicator: ${indicator}`);
        }
    } catch (error) {
        console.error(`Error processing signal: ${error.message}`);
        signal = 'HOLD';
    }
    return signal;
}

module.exports = { processSignal };
