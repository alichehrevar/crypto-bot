// strategies/optimization/OptimizeBayesian.js

// Import the GaussianProcess class from the "gaussian-process" package.
const { GaussianProcess } = require('gaussian-process');

/**
 * optimizeBayesian
 *
 * This function performs Bayesian optimization to determine the optimal riskFraction parameter,
 * which is used for calculating position sizes in trading.
 *
 * It does so by simulating trading over historical candle data for different candidate riskFraction values.
 * A Gaussian Process (GP) regression model is fitted to the candidate values and their corresponding
 * simulated profits. Then, a fine grid over the riskFraction space is evaluated using the GP model to
 * predict the profit, and the candidate with the highest predicted profit is selected.
 *
 * Simulation assumptions:
 *   - Trades are simulated using consecutive candle pairs.
 *   - For each trade:
 *       • The entry price is the previous candle's close.
 *       • The exit price is the current candle's close.
 *   - A fixed stop-loss distance (e.g., 2% or 0.02) is used.
 *   - Position size is computed as:
 *         positionSize = (balance * candidateRiskFraction) / (entryPrice * stopLossDistance)
 *   - The profit for each trade is computed as:
 *         profit = (exitPrice - entryPrice) * positionSize
 *   - The simulation starts with a fixed initial balance (e.g., $10,000) and returns the total profit.
 *
 * @param {String} symbol - Trading symbol (e.g., "BTC/USDT").
 * @param {String} timeframe - Trading timeframe (e.g., "1h").
 * @param {Array<Object>} historicalCandles - Array of historical candle objects; each must have a numeric "close" property.
 * @returns {Promise<Object>} A promise that resolves to an object containing the optimized riskFraction.
 */
async function optimizeBayesian(symbol, timeframe, historicalCandles) {
    console.log(`Optimizing parameters for ${symbol} ${timeframe} using Bayesian optimization`);

    // Set simulation constants.
    const initialBalance = 10000;    // The starting balance (in dollars) for the simulation.
    const stopLossDistance = 0.02;     // Fixed stop-loss distance as a fraction (2%).

    /**
     * simulatePerformance
     *
     * Simulates a trading strategy over the historical candles using a specific riskFraction.
     * It calculates the profit by iterating through candle pairs and updating the simulated balance.
     *
     * @param {number} riskFraction - The candidate risk fraction (e.g., 0.02).
     * @returns {number} The simulated profit (final balance minus the initial balance).
     */
    function simulatePerformance(riskFraction) {
        let balance = initialBalance;
        // Start at index 1 to have both an entry (previous candle) and an exit (current candle).
        for (let i = 1; i < historicalCandles.length; i++) {
            const entryPrice = Number(historicalCandles[i - 1].close);
            const exitPrice = Number(historicalCandles[i].close);
            // Skip if either price is not a number.
            if (isNaN(entryPrice) || isNaN(exitPrice)) continue;
            // Determine the dollar amount at risk for this trade.
            const riskAmount = balance * riskFraction;
            // Calculate the position size such that if the price falls by the stop-loss percentage,
            // the loss is approximately equal to riskAmount.
            const positionSize = riskAmount / (entryPrice * stopLossDistance);
            // Calculate the profit (or loss) for this trade.
            const profit = (exitPrice - entryPrice) * positionSize;
            // Update the balance with the profit.
            balance += profit;
        }
        // Return the overall profit from the simulation.
        return balance - initialBalance;
    }

    // Define initial candidate riskFraction values.
    let candidates = [0.01, 0.03, 0.05];
    // Evaluate the performance for each candidate.
    let observations = candidates.map(x => simulatePerformance(x));
    const iterations = 20; // Total number of optimization iterations.

    /**
     * chooseNextCandidate
     *
     * Fits a Gaussian Process to the candidate riskFraction values and their corresponding profits,
     * then evaluates a fine grid over the riskFraction space to select the candidate with the highest predicted profit.
     *
     * @param {Array<number>} xs - Array of candidate riskFraction values.
     * @param {Array<number>} ys - Array of observed profits corresponding to xs.
     * @returns {number} The candidate riskFraction with the highest predicted profit.
     */
    function chooseNextCandidate(xs, ys) {
        // Format the training data: GP expects an array of arrays for inputs.
        const X_train = xs.map(x => [x]);
        const Y_train = ys;
        // Create a Gaussian Process instance using a Gaussian kernel.
        // The GP will model the relationship between riskFraction and profit.
        const gp = new GaussianProcess(X_train, Y_train, { kernel: 'gaussian' });
        // Note: This package does not expose a separate training method, so the GP is ready once constructed.

        // Create a fine grid over the search space from 0.01 to 0.05 with a step of 0.001.
        const grid = [];
        for (let x = 0.01; x <= 0.05; x += 0.001) {
            grid.push(x);
        }

        // Initialize variables to store the best candidate and its prediction.
        let bestCandidate = grid[0];
        let bestPrediction = -Infinity;

        // Evaluate the GP model on each candidate in the grid.
        grid.forEach(candidate => {
            let prediction;
            try {
                // Call the GP's predict method for the candidate.
                const predResult = gp.predict([[candidate]]);
                // Handle various possible return formats:
                // - If predResult is an array, assume the first element is the mean prediction.
                // - If predResult is an object, check for 'mean' or 'value' properties.
                if (Array.isArray(predResult)) {
                    prediction = predResult[0];
                } else if (predResult && typeof predResult === 'object') {
                    if (predResult.mean !== undefined) {
                        prediction = predResult.mean;
                    } else if (predResult.value !== undefined) {
                        prediction = predResult.value;
                    } else {
                        prediction = Number(predResult);
                    }
                } else {
                    prediction = predResult;
                }
            } catch (err) {
                // Suppress specific error messages related to "this.mean.predict" to reduce noise.
                if (!err.message.includes('this.mean.predict')) {
                    console.error(`Error during GP prediction at candidate ${candidate}: ${err.message}`);
                }
                prediction = -Infinity;
            }
            // Ensure prediction is a valid number.
            if (typeof prediction !== 'number' || isNaN(prediction)) {
                prediction = -Infinity;
            }
            // Update the best candidate if the current prediction is higher.
            if (prediction > bestPrediction) {
                bestPrediction = prediction;
                bestCandidate = candidate;
            }
        });
        return bestCandidate;
    }

    // Main Bayesian optimization loop: iterate for a fixed number of iterations.
    for (let iter = 0; iter < iterations; iter++) {
        // Use the GP model to propose a new candidate riskFraction.
        const newCandidate = chooseNextCandidate(candidates, observations);
        // Simulate trading performance using the proposed candidate.
        const newObservation = simulatePerformance(newCandidate);
        // Add the new candidate and its observation to the data.
        candidates.push(newCandidate);
        observations.push(newObservation);
        console.log(`Iteration ${iter + 1}: Candidate ${newCandidate.toFixed(3)} yielded profit ${newObservation.toFixed(2)}`);
    }

    // Select the candidate with the highest observed profit from the collected data.
    let bestIndex = 0;
    let bestPerformance = observations[0];
    candidates.forEach((cand, idx) => {
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
