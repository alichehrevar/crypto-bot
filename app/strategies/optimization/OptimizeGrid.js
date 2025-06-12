// strategies/optimization/OptimizeGrid.js

const { simulateWholeStrategy } = require('./sharedSimulation'); // see note below

/**
 * cartesian
 *
 * Given an object whose values are arrays, returns an array of objects
 * representing every combination of picking one element from each array.
 */
function cartesian(paramSpace) {
    const keys = Object.keys(paramSpace);
    if (!keys.length) return [{}];
    const [first, ...rest] = keys;
    const firstVals = paramSpace[first];
    const restCombos = cartesian(
        rest.reduce((o, k) => ({ ...o, [k]: paramSpace[k] }), {})
    );
    return firstVals.flatMap(val =>
        restCombos.map(combo => ({ [first]: val, ...combo }))
    );
}

/**
 * optimizeGrid
 *
 * @param {String} symbol
 * @param {Array} indicators  Array of length-1: [ { indicator, timeframe, params, paramSpace } ]
 * @param {Array<Object>} historicalCandles
 * @returns {Object} The best parameter combination, e.g. { period: 14, oversold: 30, overbought: 70 }
 */
function optimizeGrid(symbol, [indicatorCfg], historicalCandles) {
    const { params, paramSpace } = indicatorCfg;
    const combos = cartesian(paramSpace);
    let best = { score: -Infinity, params: params };

    combos.forEach(combo => {
        // merge this combo over the default params
        const trialParams = { ...params, ...combo };
        // simulate the end-to-end strategy (signals + orders) and return total PnL
        const pnl = simulateWholeStrategy(symbol, trialParams, historicalCandles);
        if (pnl > best.score) {
            best = { score: pnl, params: combo };
        }
    });

    return best.params;
}

module.exports = { optimizeGrid };
