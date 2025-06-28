// FINAL WORKING FILE: app/strategies/optimization/OptimizeBayesian.js

const { BayesianOptimizer } = require('bayesian-optimizer');
const { simulateWholeStrategy } = require('./sharedSimulation');

/**
 * optimizeBayesian
 * This is the final, working version.
 */
async function optimizeBayesian(symbol, [indicatorCfg], historicalCandles, options) {
    const { indicator, params, paramSpace } = indicatorCfg;

    // 1. Convert our paramSpace object into the array format the library expects.
    const paramKeys = Object.keys(paramSpace);
    const bounds = paramKeys.map(key => paramSpace[key]);

    console.log(`Running Bayesian optimization for ${indicator}`);
    console.log('Library-compatible bounds:', bounds);

    // 2. Define the objective function to work with the library's array format.
    const objectiveFunction = (paramArray) => {
        // Convert the array of values back into a named object.
        const trialParams = {};
        paramKeys.forEach((key, index) => {
            trialParams[key] = paramArray[index];
        });

        const fullParams = { ...params, ...trialParams };
        const result = simulateWholeStrategy(indicator, fullParams, historicalCandles, options);

        // Return the single PnL score.
        return result.totalPnL;
    };

    // 3. Configure the optimizer with the correct 'bounds' format.
    const optimizer = new BayesianOptimizer({
        bounds: bounds, // Use the array format
        initPoints: 5,
        nIter: 20,
    });

    // 4. Run the optimizer by passing the function to .optimize()
    await optimizer.optimize(objectiveFunction);

    console.log('Bayesian optimization complete.');

    // =================================================================
    // │ NEW DIAGNOSTIC LOG: Inspect the final state of the optimizer  │
    // =================================================================
    console.log('--- Inspecting final optimizer state ---');
    console.dir(optimizer, { depth: 5 });
    console.log('------------------------------------');
    // =================================================================

    // 5. Get the result from the 'bestParams' property of the optimizer instance.
    const bestParamArray = optimizer.bestParams;
    const bestScore = optimizer.bestValue;

    // Convert the result array back into a named object.
    const bestParams = {};
    paramKeys.forEach((key, index) => {
        bestParams[key] = bestParamArray[index];
    });

    console.log(`Best Score (PnL): ${bestScore}`);
    console.log('Best Parameters:', bestParams);

    return bestParams;
}

module.exports = { optimizeBayesian };
