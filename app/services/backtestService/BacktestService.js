// services/backtestService/BacktestService.js

const Candle = require('../../models/Candle');
// Import indicators if needed (or use BacktestSignalProcessor to create instances dynamically)
const { processSignal } = require('./BacktestSignalProcessor');
// Import unified risk functions from our backtest risk manager.
const riskManager = require('./BacktestRiskManager');
// Import order simulation function.
const { simulateOrder } = require('./BacktestOrderSimulator');
// Import metrics calculator.
const { calculateMetrics } = require('./BacktestMetricsCalculator');

/**
 * BacktestService
 *
 * Orchestrates the simulation of a trading strategy over historical data.
 */
class BacktestService {
    /**
     * Runs a backtest using a specified indicator strategy.
     *
     * @param {Object} options - Options for the backtest.
     * @param {String} options.strategy - Indicator name used to generate signals.
     *        Supported: 'RSI', 'MA_Crossover', 'MACD', 'Donchian', 'Volume', 'Heikin_Ashi',
     *                   'Combined_RSI_MACD', 'Bollinger_Bands', 'Stochastic_RSI'
     * @param {Object} options.params - Contains indicator parameters, riskParams, and optimizationMethod.
     * @param {String} options.symbol - Trading symbol (e.g., "BTC/USDT").
     * @param {String} options.timeframe - Trading timeframe (e.g., "1h").
     * @param {Date|String} options.startDate - Inclusive start date.
     * @param {Date|String} options.endDate - Inclusive end date.
     * @param {Number} [options.initialBalance=10000] - Starting balance.
     * @param {Number} [options.positionSize=1.0] - Fraction of balance to risk per trade.
     * @returns {Object} Summary with final metrics and trade history.
     */
    async run({ strategy, params, symbol, timeframe, startDate, endDate, initialBalance = 10000, positionSize = 1.0 }) {
        try {
            // Validate the indicator strategy.
            const supportedIndicators = ['RSI', 'MA_Crossover', 'MACD', 'Donchian', 'Volume', 'Heikin_Ashi', 'Combined_RSI_MACD', 'Bollinger_Bands', 'Stochastic_RSI'];
            if (!supportedIndicators.includes(strategy)) {
                throw new Error('Invalid strategy');
            }

            // Fetch historical candles from the database.
            const candles = await Candle.find({
                symbol: symbol.toUpperCase(),
                timeframe: timeframe.toLowerCase(),
                timestamp: { $gte: new Date(startDate), $lte: new Date(endDate) }
            }).sort({ timestamp: 1 });

            if (candles.length === 0) {
                throw new Error('No historical data found');
            }

            // Initialize simulation variables.
            let balance = initialBalance;
            let openPosition = null;
            const trades = [];
            const riskParams = params.riskParams || {};

            // Determine minimum required candles based on the strategy.
            const minRequiredCandles = strategy === 'RSI'
                ? (params.period * 2 || 28)
                : (params.shortPeriod + params.longPeriod || 30);

            // Main backtest loop.
            for (let i = 0; i < candles.length; i++) {
                // Skip if there is insufficient data.
                if (i < minRequiredCandles) continue;
                const relevantCandles = candles.slice(0, i + 1);
                const currentPrice = candles[i].close;
                const currentTime = candles[i].timestamp;

                // Enforce risk limits using the risk manager.
                if (!riskManager.enforceRiskLimits(trades, riskParams, balance)) {
                    console.log("Risk limits reached. Stopping backtest.");
                    break;
                }

                // Process the signal using our signal processor.
                const signal = processSignal(relevantCandles, strategy, params);

                // Use the order simulator to simulate trades if a BUY or SELL signal is generated.
                if (signal === 'BUY' || signal === 'SELL') {
                    const { openPosition: newPosition, balance: newBalance, tradeRecord } = simulateOrder({
                        balance,
                        currentPrice,
                        currentTime,
                        signal,
                        openPosition,
                        calculatePositionSize: (bal, price) => riskManager.calculatePositionSize(riskParams, bal, price),
                        calculateTPSL: (entryPrice) => riskManager.calculateTPSL(params, entryPrice)
                    });
                    openPosition = newPosition;
                    balance = newBalance;
                    if (tradeRecord) {
                        trades.push(tradeRecord);
                    }
                }
            }

            // Mark-to-market: if a position remains open at the end, close it at the last candle's price.
            if (openPosition) {
                const lastPrice = candles[candles.length - 1].close;
                const positionValue = openPosition.sizeInBase * lastPrice;
                const unrealizedProfit = positionValue - openPosition.costInQuote;
                balance += positionValue;
                trades.push({
                    entry: openPosition.entryPrice,
                    exit: lastPrice,
                    profit: unrealizedProfit,
                    entryTime: openPosition.entryTime,
                    exitTime: candles[candles.length - 1].timestamp,
                    duration: candles[candles.length - 1].timestamp - openPosition.entryTime,
                    unrealized: true
                });
                openPosition = null;
            }

            // Optimize parameters based on historical performance.
            const optimizedParams = riskManager.optimizeParameters(
                symbol,
                timeframe,
                params.optimizationMethod || 'grid',
                candles
            );

            // Calculate performance metrics from the simulated trades.
            const metrics = calculateMetrics(trades);

            // Build and return the summary object.
            const summary = {
                strategy,
                params,
                optimizedParams,
                symbol,
                timeframe,
                initialBalance,
                finalBalance: balance,
                totalTrades: trades.filter(t => !t.unrealized).length,
                trades,
                metrics
            };

            return summary;
        } catch (error) {
            throw new Error(`Backtest failed: ${error.message}`);
        }
    }
}

module.exports = new BacktestService();
