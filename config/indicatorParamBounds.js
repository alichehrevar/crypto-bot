// app/config/indicatorParamBounds.js

/**
 * Defines parameter search spaces for supported indicators.
 * Each key is an indicator name, mapping to a "bounds" object.
 * The optimizer will iterate or sample within these ranges.
 */

module.exports = {
    RSI: {
        period:     [5, 10, 14, 20, 30],
        oversold:   [20, 30, 40],
        overbought: [60, 70, 80]
    },
    MACD: {
        shortPeriod:  [5, 8, 12, 18],
        longPeriod:   [20, 26, 34, 50],
        signalPeriod: [5, 9, 12]
    },
    BollingerBands: {
        period:      [10, 20, 30],
        stdDev:      [1.5, 2, 2.5]
    },
    StochasticRSI: {
        period:      [14, 21],
        smoothK:     [3, 5],
        smoothD:     [3, 5]
    }
    // add more indicator bounds as needed
};
