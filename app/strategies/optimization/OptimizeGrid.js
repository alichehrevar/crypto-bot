// strategies/optimization/OptimizeGrid.js
/**
 * OptimizeGrid.js
 *
 * Implements a grid search to optimize a single parameter—here, riskFraction.
 * In a real system, you would run a full simulation (backtest) for each candidate value
 * and compute performance metrics (PnL, win rate, drawdown, etc.). Here, we use a dummy
 * performance function that peaks at a specific value (e.g., 0.03).
 *
 * @param {String} symbol - Trading symbol (e.g., "BTC/USDT")
 * @param {String} timeframe - Trading timeframe (e.g., "1h")
 * @param {Array} historicalCandles - An array of historical candle data
 * @returns {Object} An object containing the optimized riskFraction parameter.
 */
function optimizeGrid(symbol, timeframe, historicalCandles) {
    console.log(`Grid optimizing for ${symbol} ${timeframe}`);

    // Define candidate riskFraction values from 1% to 5%
    const candidateRiskFractions = [0.01, 0.02, 0.03, 0.04, 0.05];
    let bestRiskFraction = candidateRiskFractions[0];
    let bestPerformance = -Infinity;

    // Dummy performance simulation function:
    // In a real scenario, you'd backtest trades using each candidate riskFraction and compute a performance metric.
    // Here, we assume performance peaks at 0.03 riskFraction.
    const simulatePerformance = (riskFraction) => {
        // This function returns a value that peaks at riskFraction 0.03.
        return -Math.pow(riskFraction - 0.03, 2) + 1; // maximum performance = 1 at 0.03
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
