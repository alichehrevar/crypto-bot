// app/services/backtestService/BacktestSignalProcessor.js

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
} = require('../../strategies/technical');

// Default indicator params (fallbacks)
const defaultParams = require('../../../config/defaultStrategyParams');

/**
 * processSignal
 */
function processSignal(candles, indicator, strategyParams = {}) {
    let signal = 'HOLD';
    // Merge passed params on top of defaults
    const params = Object.keys(strategyParams).length
        ? strategyParams
        : defaultParams[indicator] || {};

    try {
        switch (indicator) {
            case 'RSI': {
                const inst = new RSI(params);
                signal = inst.calculateSignal(candles);
                break;
            }
            case 'MACD': {
                const inst = new MACD(params);
                signal = inst.calculateSignal(candles);
                break;
            }
            case 'MA_Crossover': {
                const inst = new MACrossover(params);
                signal = inst.calculateSignal(candles);
                break;
            }
            case 'Donchian': {
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
                const win = params.parameters?.confirmation_window ?? 6;
                signal = CombinedRsiMacd.calculateCombinedRsiMacdSignal(
                    candles,
                    'combined',
                    { parameters: { confirmation_window: win } }
                );
                break;
            }
            case 'Bollinger_Bands': {
                signal = BollingerBands.calculateBollingerBandsSignal(candles, 'bollinger');
                break;
            }
            case 'Stochastic_RSI': {
                const inst = new StochasticRSI(params);
                signal = inst.calculateSignal(candles);
                break;
            }
            default:
                console.error(`Unknown indicator: ${indicator}`);
        }
    } catch (err) {
        console.error(`Signal error for ${indicator}:`, err.message);
        signal = 'HOLD';
    }

    return signal;
}

module.exports = { processSignal };
