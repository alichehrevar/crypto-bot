// strategies/optimization/OptimizeBayesian.js

const { BayesianOptimizer } = require('bayesian-optimizer');
const { simulateWholeStrategy } = require('./sharedSimulation');

/**
 * optimizeBayesian
 *
 * Performs Bayesian optimization over the full indicator parameter space.
 *
 * @param {String} symbol
 * @param {Array}  indicators        Array of length-1: [ { indicator, timeframe, params, paramSpace } ]
 * @param {Array}  historicalCandles Array of candle objects.
 * @returns {Promise<Object>}        Resolves to the best parameter combo, e.g. { period: 14, oversold: 30, overbought: 70 }
 */
async function optimizeBayesian(symbol, [indicatorCfg], historicalCandles) {
    const { params, paramSpace } = indicatorCfg;

    console.log(`Running Bayesian optimization for ${symbol} ${indicatorCfg.timeframe}`);
    console.log('Parameter bounds:', paramSpace);

    // Objective: given a trialParams object (subset of params), return total PnL
    const simulatePerf = (trialParams) => {
        // merge trial parameters into base params
        const fullParams = { ...params, ...trialParams };
        return simulateWholeStrategy(symbol, fullParams, historicalCandles);
    };

    // Configure the optimizer with your bounds, initial points, and iterations
    const optimizer = new BayesianOptimizer({
        f: simulatePerf,
        bounds:       paramSpace,
        initPoints:   5,   // number of random starts
        nIter:        20,  // Bayesian iterations
        exploration:  0.01 // EI trade-off
    });

    // Run optimization
    const result = await optimizer.optimize();
    console.log('Bayesian result:', result);

    // result.best is an object with the selected combo
    return result.best;
}

module.exports = { optimizeBayesian };
