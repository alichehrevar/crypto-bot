/**
 * OptimizeGrid.js
 *
 * Implements a grid search optimization routine for a single parameter: riskFraction.
 */

function optimizeGrid(symbol, timeframe, historicalCandles) {
    console.log(`Grid optimizing for ${symbol} ${timeframe}`);
    // Define candidate riskFraction values from 1% to 5%.
    const candidateRiskFractions = [0.01, 0.02, 0.03, 0.04, 0.05];
    let bestRiskFraction = candidateRiskFractions[0];
    let bestPerformance = -Infinity;

    // Dummy performance function.
    // Replace this with an actual backtest simulation for each candidate.
    const simulatePerformance = (riskFraction) => {
        // For demonstration, assume performance peaks at riskFraction = 0.03.
        return -Math.pow(riskFraction - 0.03, 2) + 1; // max = 1 at 0.03
    };

    candidateRiskFractions.forEach((riskFraction) => {
        const performance = simulatePerformance(riskFraction);
        console.log(`Candidate riskFraction: ${riskFraction}, performance: ${performance}`);
        if (performance > bestPerformance) {
            bestPerformance = performance;
            bestRiskFraction = riskFraction;
        }
    });

    console.log(`Optimized riskFraction for ${symbol} ${timeframe} is ${bestRiskFraction}`);
    return { riskFraction: bestRiskFraction };
}

module.exports = { optimizeGrid };
