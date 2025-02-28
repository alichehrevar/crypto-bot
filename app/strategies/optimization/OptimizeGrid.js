// strategies/optimization/OptimizeGrid.js
/**
 * OptimizeGrid.js
 *
 * This module implements a grid search optimization routine for risk parameters,
 * specifically for optimizing the riskFraction used in compound position sizing.
 *
 * For each candidate riskFraction, we simulate trading over historical candles.
 * The simulation uses the following assumptions:
 *  - We assume a trade is executed on every candle pair.
 *  - The entry price is the previous candle's close, and the exit price is the current candle's close.
 *  - We assume a fixed stopLossDistance (for example, 2% or 0.02) to compute the trade size.
 *  - The profit (or loss) from each trade is calculated as:
 *         profit = (exitPrice - entryPrice) * (riskAmount / (entryPrice * stopLossDistance))
 *    where riskAmount = currentBalance * candidateRiskFraction.
 *  - The simulation starts with a fixed initial balance (e.g. $10,000) and updates it after each trade.
 *  - The candidate with the highest final balance is chosen as optimal.
 *
 * @param {String} symbol - Trading symbol (e.g., "BTC/USDT").
 * @param {String} timeframe - Trading timeframe (e.g., "1h").
 * @param {Array} historicalCandles - Array of candle objects (each should have a numeric "close" property).
 * @returns {Object} Optimized parameters, e.g., { riskFraction: 0.03 }.
 */

function optimizeGrid(symbol, timeframe, historicalCandles) {
    console.log(`Optimizing parameters for ${symbol} ${timeframe} using grid search`);

    // Define candidate riskFraction values from 1% to 5%
    const candidateRiskFractions = [0.01, 0.02, 0.03, 0.04, 0.05];
    let bestRiskFraction = candidateRiskFractions[0];
    let bestFinalBalance = -Infinity;

    // Parameters for the simulation
    const initialBalance = 10000;   // starting balance (in dollars)
    const stopLossDistance = 0.02;    // assume a fixed stop loss of 2%

    /**
     * simulatePerformance runs a simple trade simulation using the candidate riskFraction.
     * For each candle pair, it calculates a trade size based on:
     *   positionSize = (balance * candidateRiskFraction) / (entryPrice * stopLossDistance)
     * and updates the balance based on the profit/loss from the trade.
     *
     * @param {number} candidateRiskFraction - The candidate risk fraction (e.g., 0.02)
     * @returns {number} The final balance after processing all trades.
     */
    function simulatePerformance(candidateRiskFraction) {
        let balance = initialBalance;
        // Start simulation from the second candle (so we have an entry and exit price)
        for (let i = 1; i < historicalCandles.length; i++) {
            const entryPrice = Number(historicalCandles[i - 1].close);
            const exitPrice = Number(historicalCandles[i].close);
            if (!entryPrice || !exitPrice) continue;
            // Calculate the amount at risk for this trade.
            const riskAmount = balance * candidateRiskFraction;
            // Determine the trade size: how many units you can buy such that a stop-loss hit (2% move)
            // would cost you approximately riskAmount.
            const positionSize = riskAmount / (entryPrice * stopLossDistance);
            // Calculate profit: (exitPrice - entryPrice) * positionSize.
            const profit = (exitPrice - entryPrice) * positionSize;
            // Update balance.
            balance += profit;
        }
        return balance;
    }

    // Grid search: iterate over candidate risk fractions.
    candidateRiskFractions.forEach((candidate) => {
        const finalBalance = simulatePerformance(candidate);
        console.log(`Candidate riskFraction: ${candidate}, Final Balance: ${finalBalance.toFixed(2)}`);
        if (finalBalance > bestFinalBalance) {
            bestFinalBalance = finalBalance;
            bestRiskFraction = candidate;
        }
    });

    console.log(`Optimized riskFraction for ${symbol} ${timeframe} is ${bestRiskFraction} with final balance ${bestFinalBalance.toFixed(2)}`);
    return { riskFraction: bestRiskFraction };
}

module.exports = { optimizeGrid };
