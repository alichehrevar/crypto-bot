/**
 * @file A shared simulation function for the optimization engine,
 * updated to be fully compatible with the new class-based components.
 * @author Your Name
 */

// Import the class-based and functional modules
const BacktestOrderSimulator  = require('../../services/backtestService/BacktestOrderSimulator');
const BacktestSignalProcessor = require('../../services/backtestService/BacktestSignalProcessor');
const calculateMetrics        = require('../../services/backtestService/BacktestMetricsCalculator');
const { enforceRiskLimits }   = require('../../services/backtestService/riskUtils');

/**
 * @description Runs a full simulation for a single set of parameters and returns the result.
 * This is the core function called repeatedly by the optimizer. It now correctly
 * uses the class-based architecture.
 * @param {string} indicator - The name of the indicator (e.g., 'RSI').
 * @param {object} params - The parameters for the indicator (e.g., { period: 14 }).
 * @param {Array<object>} candles - The historical candle data.
 * @param {object} options - Options including initialBalance and risk parameters.
 * @returns {object} The final metrics and trade list for the simulation run.
 */
function simulateWholeStrategy(indicator, params, candles, options) {
    const { initialBalance = 10000, risk = {} } = options;

    // 1. Instantiate the new, class-based components.
    const signaler  = new BacktestSignalProcessor(indicator, params);
    const simulator = new BacktestOrderSimulator({
        initialBalance,
        riskParams: risk,
        equityCurve: [initialBalance]
    });

    // 2. Loop through each candle and run the simulation step.
    for (const candle of candles) {
        // Call the instance methods correctly.
        const signal = signaler.next(candle);
        simulator.step(candle, signal);

        // Risk limits are optional during optimization for speed, but can be included.
        const unreal = simulator.equityCurve[simulator.equityCurve.length - 1] - simulator.balance;
        const keepTrading = enforceRiskLimits(
            simulator.trades,
            risk,
            simulator.equityCurve,
            new Date(candle.time),
            unreal
        );
        if (!keepTrading) {
            break;
        }
    }

    // 3. Close any final position.
    const last = candles[candles.length - 1];
    simulator.closeFinal(last.close, last.time);

    // 4. Calculate metrics and return the result.
    const metrics = calculateMetrics({
        trades:       simulator.trades,
        equityCurve:  simulator.equityCurve,
        initialBalance
    });

    // The optimizer expects the total PnL as a direct property for scoring.
    return {
        metrics,
        trades: simulator.trades,
        totalPnL: metrics.totalPnL
    };
}

module.exports = {
    simulateWholeStrategy,
};
