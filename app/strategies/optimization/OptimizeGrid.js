// strategies/optimization/OptimizeGrid.js

/**
 * OptimizeGrid.js
 *
 * This module implements a grid search optimization routine for a risk parameter,
 * specifically the riskFraction used in compound position sizing.
 *
 * For each candidate riskFraction, the module simulates trading over the historical candles.
 * The simulation assumes:
 *   - A trade is executed for every consecutive candle pair.
 *   - The entry price is the previous candle's close, and the exit price is the current candle's close.
 *   - A fixed stopLossDistance (e.g., 0.02 for 2%) is used to compute the trade size.
 *   - The trade size is calculated as:
 *         positionSize = (balance * candidateRiskFraction) / (entryPrice * stopLossDistance)
 *   - Profit (or loss) is computed as:
 *         profit = (exitPrice - entryPrice) * positionSize
 *   - The simulation starts with a fixed initial balance (e.g., $10,000) and updates it after each trade.
 *   - The candidate riskFraction that results in the highest final balance is selected as optimal.
 *
 * @param {String} symbol - Trading symbol (e.g., "BTC/USDT").
 * @param {String} timeframe - Trading timeframe (e.g., "1h").
 * @param {Array<Object>} historicalCandles - Array of historical candle objects, each with a numeric "close" property.
 * @returns {Object} An object with the optimized parameter, e.g., { riskFraction: 0.03 }.
 */
function optimizeGrid(symbol, timeframe, historicalCandles) {
    console.log(`Optimizing parameters for ${symbol} ${timeframe} using grid search`);

    // Define candidate riskFraction values from 1% to 5%
    const candidateRiskFractions = [0.01, 0.02, 0.03, 0.04, 0.05];
    let bestRiskFraction = candidateRiskFractions[0];
    let bestFinalBalance = -Infinity;

    // Simulation parameters: starting balance and fixed stop loss distance (e.g., 2%).
    const initialBalance = 10000;   // in dollars
    const stopLossDistance = 0.02;    // 2%

    /**
     * simulatePerformance
     *
     * Simulates trading over the historical candle data using a given candidate riskFraction.
     * For each consecutive candle pair, the simulation calculates:
     *   - The riskAmount as balance * candidateRiskFraction.
     *   - The position size as riskAmount / (entryPrice * stopLossDistance).
     *   - The profit or loss from the trade, which is then used to update the balance.
     *
     * @param {number} candidateRiskFraction - The candidate risk fraction (e.g., 0.02 for 2%).
     * @returns {number} The final balance after processing all candle pairs.
     */
    function simulatePerformance(candidateRiskFraction) {
        let balance = initialBalance;
        // Loop over candle pairs starting from the second candle (index 1).
        for (let i = 1; i < historicalCandles.length; i++) {
            // Parse entry and exit prices; assume each candle has a valid numeric close.
            const entryPrice = Number(historicalCandles[i - 1].close);
            const exitPrice = Number(historicalCandles[i].close);

            // If either price is not a number, skip this iteration.
            if (isNaN(entryPrice) || isNaN(exitPrice)) continue;

            // Calculate the risk amount based on current balance.
            const riskAmount = balance * candidateRiskFraction;

            // Compute position size:
            // It represents the number of units that can be bought so that if the price falls by the stopLossDistance,
            // the total loss equals approximately riskAmount.
            const positionSize = riskAmount / (entryPrice * stopLossDistance);

            // Calculate profit (or loss) for this trade.
            const profit = (exitPrice - entryPrice) * positionSize;

            // Update balance.
            balance += profit;
        }
        return balance - initialBalance;
    }

    // Perform a grid search over candidate risk fractions.
    candidateRiskFractions.forEach((candidate) => {
        const finalBalance = simulatePerformance(candidate);
        console.log(`Candidate riskFraction: ${candidate}, Final Balance: ${finalBalance.toFixed(2)}`);
        // Update the best candidate if the final balance is higher.
        if (finalBalance > bestFinalBalance) {
            bestFinalBalance = finalBalance;
            bestRiskFraction = candidate;
        }
    });

    console.log(`Optimized riskFraction for ${symbol} ${timeframe} is ${bestRiskFraction} with final balance ${bestFinalBalance.toFixed(2)}`);
    return { riskFraction: bestRiskFraction };
}

module.exports = { optimizeGrid };
