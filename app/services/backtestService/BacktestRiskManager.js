// File: app/services/backtestService/BacktestRiskManager.js
/**
 * @file Interface to the backend optimization engine.
 */
const OptimizationManager = require('../../strategies/optimization/OptimizationManager');

async function optimizeParameters(symbol, indicators, method, historicalCandles, options) {
    return OptimizationManager.optimize(symbol, indicators, method, historicalCandles, options);
}

module.exports = {
    optimizeParameters,
};
