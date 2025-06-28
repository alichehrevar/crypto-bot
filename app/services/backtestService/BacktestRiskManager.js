// REVISED AND SIMPLIFIED: app/services/backtestService/BacktestRiskManager.js

const OptimizationManager = require('../../strategies/optimization/OptimizationManager');

// This is the only function left in this file.
async function optimizeParameters(symbol, indicators, method, historicalCandles, options) {
    // We pass all arguments along to the Optimization Manager
    return OptimizationManager.optimize(symbol, indicators, method, historicalCandles, options);
}

module.exports = {
    optimizeParameters,
};
