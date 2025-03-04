
// Import GaussianProcess from the 'gaussian-process' package.
const { GaussianProcess } = require('gaussian-process');

/**
 * optimizeBayesian
 *
 * Uses Bayesian optimization via Gaussian Process regression to optimize the riskFraction parameter.
 * This implementation simulates trading performance over historical candle data for a candidate riskFraction,
 * fits a Gaussian Process to these observations, and then uses the GP's predictions to select the candidate that is estimated to maximize profit.
 *
 * Simulation assumptions:
 *  - A trade is executed on every consecutive candle pair.
 *  - Entry price is the previous candle's close; exit price is the current candle's close.
 *  - A fixed stopLossDistance (e.g., 0.02 for 2%) is used.
 *  - Position size is computed as:
 *         positionSize = (balance * candidateRiskFraction) / (entryPrice * stopLossDistance)
 *  - Profit for a trade = (exitPrice - entryPrice) * positionSize.
 *  - The simulation starts with an initial balance (e.g., $10,000) and returns total profit.
 *
 * @param {String} symbol - Trading symbol (e.g., "BTC/USDT").
 * @param {String} timeframe - Trading timeframe (e.g., "1h").
 * @param {Array<Object>} historicalCandles - Array of historical candle objects with a numeric "close" property.
 * @returns {Promise<Object>} A promise that resolves to an object containing the optimized riskFraction, e.g. { riskFraction: 0.03 }.
 */
async function optimizeBayesian(symbol, timeframe, historicalCandles) {
    console.log(`Optimizing parameters for ${symbol} ${timeframe} using Bayesian optimization`);

    // Simulation constants.
    const initialBalance = 10000;    // Starting balance in dollars.
    const stopLossDistance = 0.02;     // Fixed stop loss distance (2%).

    /**
     * simulatePerformance
     *
     * Simulates trading over historical candle data using a given candidate riskFraction.
     * Returns the profit (final balance minus initial balance).
     *
     * @param {number} riskFraction - Candidate risk fraction (e.g., 0.02).
     * @returns {number} Simulated profit.
     */
    function simulatePerformance(riskFraction) {
        let balance = initialBalance;
        // Loop over candle pairs (starting at index 1 to have both entry and exit prices).
        for (let i = 1; i < historicalCandles.length; i++) {
            const entryPrice = Number(historicalCandles[i - 1].close);
            const exitPrice = Number(historicalCandles[i].close);
            if (isNaN(entryPrice) || isNaN(exitPrice)) continue;
            const riskAmount = balance * riskFraction;
            // Determine position size such that a drop by stopLossDistance would lose approximately riskAmount.
            const positionSize = riskAmount / (entryPrice * stopLossDistance);
            const profit = (exitPrice - entryPrice) * positionSize;
            balance += profit;
        }
        return balance - initialBalance;
    }

    // Define an array of initial candidate riskFractions.
    let candidates = [0.01, 0.03, 0.05];
    // Evaluate each candidate with the simulation.
    let observations = candidates.map(x => simulatePerformance(x));

    // Number of optimization iterations.
    const iterations = 20;

    /**
     * chooseNextCandidate
     *
     * Uses Gaussian Process regression to model the relationship between riskFraction and profit,
     * then predicts profits for a finely spaced grid of candidate values to choose the next candidate.
     *
     * @param {Array<number>} xs - Array of candidate riskFraction values.
     * @param {Array<number>} ys - Array of observed profits corresponding to xs.
     * @returns {number} The candidate riskFraction with the highest predicted profit.
     */
    function chooseNextCandidate(xs, ys) {
        // Format the training data for the GaussianProcess:
        // GP expects an array of arrays for inputs.
        const X_train = xs.map(x => [x]);
        const Y_train = ys;

        // Create a new Gaussian Process with default options.
        const gp = new GaussianProcess(X_train, Y_train, { kernel: 'gaussian' });

        // Define a fine grid over the search space.
        const grid = [];
        for (let x = 0.01; x <= 0.05; x += 0.001) {
            grid.push(x);
        }

        let bestCandidate = grid[0];
        let bestPrediction = -Infinity;
        // Evaluate the GP prediction for each candidate in the grid.
        grid.forEach(candidate => {
            let prediction;
            try {
                // Attempt to predict at the candidate value.
                // The API may return an array; we try to extract the mean prediction.
                const predictionResult = gp.predict([[candidate]]);
                // If predictionResult is an array, assume the first element is the mean.
                prediction = Array.isArray(predictionResult) ? predictionResult[0] : predictionResult;
            } catch (err) {
                console.error(`Error during GP prediction at candidate ${candidate}: ${err.message}`);
                prediction = -Infinity;
            }
            if (typeof prediction !== 'number' || isNaN(prediction)) {
                prediction = -Infinity;
            }
            if (prediction > bestPrediction) {
                bestPrediction = prediction;
                bestCandidate = candidate;
            }
        });
        return bestCandidate;
    }

    // Main Bayesian optimization loop.
    for (let iter = 0; iter < iterations; iter++) {
        const newCandidate = chooseNextCandidate(candidates, observations);
        const newObservation = simulatePerformance(newCandidate);
        candidates.push(newCandidate);
        observations.push(newObservation);
        console.log(`Iteration ${iter + 1}: Candidate ${newCandidate.toFixed(3)} yielded profit ${newObservation.toFixed(2)}`);
    }

    // Choose the candidate with the highest observed profit.
    let bestIndex = 0;
    let bestPerformance = observations[0];
    candidates.forEach((candidate, idx) => {
        if (observations[idx] > bestPerformance) {
            bestPerformance = observations[idx];
            bestIndex = idx;
        }
    });

    const optimalRiskFraction = candidates[bestIndex];
    console.log(`Optimized riskFraction for ${symbol} ${timeframe} is ${optimalRiskFraction} with profit ${bestPerformance.toFixed(2)}`);
    return { riskFraction: optimalRiskFraction };
}

module.exports = { optimizeBayesian };
