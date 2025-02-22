const RSI = require('../../indicators/RSI');
const MACD = require('../../indicators/MACD');
const MACrossover = require('../../indicators/MovingAverageCrossover');

/**
 * Processes historical candles to generate a trading signal using the specified indicator.
 * @param {Array} candles - Historical candle data.
 * @param {String} indicator - One of 'RSI', 'MACD', 'MA_Crossover'.
 * @param {Object} strategyParams - Parameters for the indicator.
 * @returns {String} A signal ('BUY', 'SELL', or 'HOLD').
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
            default:
                console.error(`Unknown indicator: ${indicator}`);
        }
    } catch (error) {
        console.error(`Error processing signal: ${error.message}`);
    }
    return signal;
}

module.exports = { processSignal };
