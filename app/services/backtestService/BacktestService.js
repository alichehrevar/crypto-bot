// services/BacktestService.js
const Candle = require('../../models/Candle');
const { processSignal } = require('./BacktestSignalProcessor');
const { enforceRiskLimits, calculatePositionSize, calculateTPSL, optimizeParameters } = require('./BacktestRiskManager');
const { simulateOrder } = require('./BacktestOrderSimulator');
const { calculateMetrics } = require('./BacktestMetricsCalculator');

class BacktestService {
    /**
     * Runs a backtest using a specified indicator (RSI, MA_Crossover, or MACD).
     *
     * @param {Object} options
     * @param {String} options.strategy - One of: 'RSI', 'MA_Crossover', 'MACD'
     * @param {Object} options.params - Contains indicator parameters, riskParams, optimizationMethod, etc.
     * @param {String} options.symbol - e.g., "BTC/USDT"
     * @param {String} options.timeframe - e.g., "1h"
     * @param {Date|String} options.startDate - Inclusive start date.
     * @param {Date|String} options.endDate - Inclusive end date.
     * @param {Number} [options.initialBalance=10000] - Starting balance.
     * @param {Number} [options.positionSize=1.0] - Fraction of balance to risk per trade.
     * @returns {Object} A summary with performance metrics and trade history.
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
            // Validate indicator strategy.
            if (!['RSI', 'MA_Crossover', 'MACD'].includes(strategy)) {
                throw new Error('Invalid strategy. Expected: RSI, MA_Crossover, or MACD.');
            }
            // Fetch historical candle data.
            const candles = await Candle.find({
                symbol: symbol.toUpperCase(),
                timeframe: timeframe.toLowerCase(),
                timestamp: { $gte: new Date(startDate), $lte: new Date(endDate) },
            }).sort({ timestamp: 1 });
            if (candles.length === 0) {
                throw new Error('No historical data found');
            }

            let balance = initialBalance;
            let openPosition = null;
            const trades = [];
            const riskParams = params.riskParams || {};

            // Determine minimum required candles.
            const minRequiredCandles =
                strategy === 'RSI'
                    ? (params.period * 2 || 28)
                    : (params.shortPeriod + params.longPeriod || 30);

            for (let i = 0; i < candles.length; i++) {
                if (i < minRequiredCandles) continue;
                const relevantCandles = candles.slice(0, i + 1);
                const currentPrice = candles[i].close;
                const currentTime = candles[i].timestamp;

                // Enforce risk limits.
                if (!enforceRiskLimits(trades, riskParams, balance)) {
                    console.log("Risk limits reached. Stopping backtest.");
                    break;
                }

                // Process signal using the indicator.
                const signal = processSignal(relevantCandles, strategy, params);
                if (signal === 'BUY') {
                    if (!openPosition) {
                        const amountToInvest = balance * positionSize;
                        if (amountToInvest <= 0) continue;
                        let quantity = calculatePositionSize(riskParams, balance, currentPrice);
                        quantity *= positionSize;
                        const { TP, SL } = calculateTPSL(params, currentPrice);
                        openPosition = {
                            entryPrice: currentPrice,
                            sizeInBase: quantity,
                            costInQuote: quantity * currentPrice,
                            entryTime: currentTime,
                            TP,
                            SL,
                        };
                        balance -= openPosition.costInQuote;
                        console.log(`Opened BUY at ${currentPrice}, quantity: ${quantity}, TP: ${TP}, SL: ${SL}`);
                    }
                } else if (signal === 'SELL') {
                    if (openPosition) {
                        const exitPrice = currentPrice;
                        const positionValue = openPosition.sizeInBase * exitPrice;
                        const profit = positionValue - openPosition.costInQuote;
                        balance += positionValue;
                        trades.push({
                            entry: openPosition.entryPrice,
                            exit: exitPrice,
                            profit,
                            entryTime: openPosition.entryTime,
                            exitTime: currentTime,
                            duration: currentTime - openPosition.entryTime,
                            closedBy: 'SELL signal',
                        });
                        console.log(`Closed trade at ${exitPrice}, profit: ${profit}`);
                        openPosition = null;
                    }
                }
            }

            // Mark-to-market if a position remains open.
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

            // Optimize parameters.
            const optimizedParams = riskStrategy.optimizeParameters(
                symbol,
                timeframe,
                params.optimizationMethod || 'grid',
                candles
            );

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
                metrics: calculateMetrics(trades),
            };

            return summary;
        } catch (error) {
            throw new Error(`Backtest failed: ${error.message}`);
        }
    }
}

module.exports = new BacktestService();
