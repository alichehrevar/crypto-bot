// strategies/optimization/OptimizeBayesian.js

// Import the BayesianOptimizer class from the "bayesian-optimizer" package.
const { BayesianOptimizer } = require('bayesian-optimizer');

/**
 * optimizeBayesian
 *
 * This function performs Bayesian optimization to determine the optimal riskFraction parameter,
 * which is used for calculating position sizes in trading.
 *
 * It uses Expected Improvement to balance exploration and exploitation, simulating trading
 * over historical candle data to evaluate candidate riskFraction values.
 *
 * @param {String} symbol
 * @param {Object} indicators - Array of indicator configs; we only use indicators[0].
 * @param {Array<Object>} historicalCandles - Array of historical candle objects.
 * @returns {Promise<Object>} Resolves to { riskFraction: <best> }.
 */
async function optimizeBayesian(symbol, indicators, historicalCandles) {
    const timeframe = indicators.timeframe;
    console.log(`Optimizing parameters for ${symbol} ${timeframe} using Bayesian optimization`);

    // Simulation function for a given risk fraction
    const initialBalance   = 10000;
    const stopLossDistance = 0.02;
    const simulatePerformance = (params) => {
        const riskFraction = params.riskFraction;
        let balance = initialBalance;
        for (let i = 1; i < historicalCandles.length; i++) {
            const entry = Number(historicalCandles[i - 1].close);
            const exit  = Number(historicalCandles[i].close);
            if (isNaN(entry) || isNaN(exit)) continue;
            const size  = (balance * riskFraction) / (entry * stopLossDistance);
            balance += (exit - entry) * size;
        }
        return balance - initialBalance;
    };

    // Configure search space and optimizer
    const searchSpace = {
        riskFraction: { min: 0.01, max: 0.05 }
    };
    const initPoints   = 5;   // initial random evaluations
    const nIter        = 20;  // Bayesian optimization steps

    // Initialize optimizer
    const optimizer = new BayesianOptimizer({
        exploration: 0.01,     // trade-off parameter for EI
        numCandidates: 100,    // samples per step
    });

    // Run Bayesian optimization
    await optimizer.optimize(simulatePerformance, searchSpace, initPoints + nIter);

    // Retrieve best parameters
    const best = optimizer.getBestParams();
    console.log('Bayesian optimization best params:', best);

    return { riskFraction: best.riskFraction };
}

module.exports = { optimizeBayesian };
