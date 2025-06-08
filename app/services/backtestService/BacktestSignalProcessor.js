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
 *
 * @param {Array} candles
 * @param {String} indicator
 * @param {Object} strategyParams
 * @returns {'BUY'|'SELL'|'HOLD'}
 */
function processSignal(candles, indicator, strategyParams = {}) {
    // merge defaults first
    const params = { ...(defaultParams[indicator] || {}), ...strategyParams };

    // ── WARM-UP GUARDS ─────────────────────────────────────────────────────────
    switch (indicator) {
        case 'RSI': {
            const period = params.period;             // e.g. 14
            const needed = period * 2;                // twice the period
            if (candles.length < needed) return 'HOLD';
            break;
        }
        case 'MACD': {
            const { shortPeriod = 12, longPeriod = 26, signalPeriod = 9 } = params;
            if (candles.length < shortPeriod + longPeriod + signalPeriod) return 'HOLD';
            break;
        }
        case 'MA_Crossover': {
            const { longPeriod = 20 } = params;
            if (candles.length < longPeriod) return 'HOLD';
            break;
        }
        case 'Donchian': {
            const { period = 20 } = params;
            if (candles.length < period) return 'HOLD';
            break;
        }
        case 'Volume': {
            const { period = 14 } = params;
            if (candles.length < period) return 'HOLD';
            break;
        }
        case 'Heikin_Ashi': {
            if (candles.length < 2) return 'HOLD';
            break;
        }
        case 'Combined_RSI_MACD': {
            const rsiWarm = (params.period || 14) * 2;
            const macdWarm = (params.shortPeriod || 12)
                + (params.longPeriod  || 26)
                + (params.signalPeriod|| 9);
            if (candles.length < Math.max(rsiWarm, macdWarm)) return 'HOLD';
            break;
        }
        case 'Bollinger_Bands': {
            const { period = 20 } = params;
            if (candles.length < period) return 'HOLD';
            break;
        }
        case 'Stochastic_RSI': {
            const { period = 14, kPeriod = 3, dPeriod = 3 } = params;
            if (candles.length < period + kPeriod + dPeriod) return 'HOLD';
            break;
        }
        default:
            // no guard
            break;
    }

    // ── SIGNAL CALCULATION ─────────────────────────────────────────────────────
    let signal = 'HOLD';
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
            case 'Donchian':
                signal = Donchian.calculateDonchianSignal(candles, 'donchian');
                break;
            case 'Volume':
                signal = Volume.calculateVolumeSignal(candles, 'volume');
                break;
            case 'Heikin_Ashi':
                signal = HeikinAshi.calculateHeikinAshiSignal(candles, 'heikinashi');
                break;
            case 'Combined_RSI_MACD': {
                const window = params.parameters?.confirmation_window ?? 6;
                signal = CombinedRsiMacd.calculateCombinedRsiMacdSignal(
                    candles, 'combined', { parameters: { confirmation_window: window } }
                );
                break;
            }
            case 'Bollinger_Bands':
                signal = BollingerBands.calculateBollingerBandsSignal(candles, 'bollinger');
                break;
            case 'Stochastic_RSI': {
                const inst = new StochasticRSI(params);
                signal = inst.calculateSignal(candles);
                break;
            }
            default:
                console.warn(`🛑 processSignal: unsupported indicator "${indicator}"`);
        }
    } catch (err) {
        console.error(`⚠️ Signal error for ${indicator}:`, err.message);
        signal = 'HOLD';
    }

    return signal;
}

module.exports = { processSignal };
