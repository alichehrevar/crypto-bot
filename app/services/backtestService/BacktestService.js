const Candle = require('../../models/Candle');
// The processSignal function instantiates the chosen indicator and returns a signal.
const { processSignal } = require('./BacktestSignalProcessor');
// Unified risk management functions (position sizing, TP/SL, risk limits, and optimization).
const riskManager = require('./BacktestRiskManager');
// Simulates order execution based on signals.
const { simulateOrder } = require('./BacktestOrderSimulator');
// Calculates performance metrics from trade history.
const { calculateMetrics } = require('./BacktestMetricsCalculator');

/**
 * BacktestService
 *
 * Orchestrates the simulation of a trading strategy over historical candle data.
 * It fetches historical data, processes signals via an indicator, simulates order execution,
 * enforces risk limits, and finally calculates performance metrics.
 */
class BacktestService {
    /**
     * Runs a backtest using a specified indicator strategy.
     *
     * @param {Object} options - Options for the backtest.
     * @param {String} options.strategy - The indicator name used to generate signals.
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
    async run({
                  strategy,
                  params,
                  symbol,
                  timeframe,
                  startDate,
                  endDate,
                  initialBalance = 10000,
                  positionSize = 1.0,
              }) {
        try {
            // Validate that the chosen strategy (indicator) is supported.
            const supportedIndicators = [
                'RSI',
                'MA_Crossover',
                'MACD',
                'Donchian',
                'Volume',
                'Heikin_Ashi',
                'Combined_RSI_MACD',
                'Bollinger_Bands',
                'Stochastic_RSI',
            ];
            if (!supportedIndicators.includes(strategy)) {
                throw new Error('Invalid strategy');
            }

            // Fetch historical candles from the database.
            const candles = await Candle.find({
                symbol: symbol.toUpperCase(),
                timeframe: timeframe.toLowerCase(),
                timestamp: { $gte: new Date(startDate), $lte: new Date(endDate) },
            }).sort({ timestamp: 1 });

            if (candles.length === 0) {
                throw new Error('No historical data found');
            }

            // Initialize simulation variables.
            let balance = initialBalance;
            let openPosition = null;
            const trades = [];
            // Extract risk management parameters from params.
            const riskParams = params.riskParams || {};

            // Determine the minimum required candles for signal generation.
            // For RSI, we require roughly 2 * period candles; for others, use a sum of short and long periods.
            const minRequiredCandles =
                strategy === 'RSI'
                    ? params.period * 2 || 28
                    : params.shortPeriod && params.longPeriod
                        ? params.shortPeriod + params.longPeriod
                        : 30;

            // Main backtest loop: iterate over each candle.
            for (let i = 0; i < candles.length; i++) {
                // Skip if we haven't reached enough data points.
                if (i < minRequiredCandles) continue;
                const relevantCandles = candles.slice(0, i + 1);
                const currentPrice = candles[i].close;
                const currentTime = candles[i].timestamp;

                // Enforce risk limits based on today's trades and current balance.
                if (!riskManager.enforceRiskLimits(trades, riskParams, balance)) {
                    console.log('Risk limits reached. Stopping backtest.');
                    break;
                }

                // Process the signal using the chosen indicator.
                const signal = processSignal(relevantCandles, strategy, params);

                // If we get a BUY or SELL signal, simulate order execution.
                if (signal === 'BUY' || signal === 'SELL') {
                    const { openPosition: newPos, balance: newBal, tradeRecord } = simulateOrder({
                        balance,
                        currentPrice,
                        currentTime,
                        signal,
                        openPosition,
                        // Use risk manager functions for position sizing and TP/SL calculations.
                        calculatePositionSize: (bal, price) =>
                            riskManager.calculatePositionSize(riskParams, bal, price),
                        calculateTPSL: (entryPrice) => riskManager.calculateTPSL(params, entryPrice),
                    });
                    openPosition = newPos;
                    balance = newBal;
                    if (tradeRecord) {
                        trades.push(tradeRecord);
                    }
                }
            }

            // Mark-to-market: if a position remains open at the end, close it using the last candle's price.
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
                    unrealized: true,
                });
                openPosition = null;
            }

            // Optionally, optimize parameters using the risk manager's optimization function.
            const optimizedParams = await riskManager.optimizeParameters(
                symbol,
                timeframe,
                params.optimizationMethod || 'grid',
                candles
            );

            // Calculate performance metrics from the trade history.
            const metrics = calculateMetrics(trades);

            // Build and return a summary object.
            const summary = {
                strategy,
                params,
                optimizedParams,
                symbol,
                timeframe,
                initialBalance,
                finalBalance: balance,
                totalTrades: trades.filter((t) => !t.unrealized).length,
                trades,
                metrics,
            };

            return summary;
        } catch (error) {
            throw new Error(`Backtest failed: ${error.message}`);
        }
    }
}

module.exports = new BacktestService();
