// services/BacktestService.js
const Candle = require('../models/Candle');
const { RSI, MACrossover, MACD } = require('../indicators');
// Import refined risk functions.
const riskStrategy = require('../strategies/RiskStrategy');

class BacktestService {
    /**
     * Runs a backtest using a specified indicator (RSI, MA_Crossover, or MACD).
     *
     * @param {Object} options
     * @param {String} options.strategy - Must be one of: 'RSI', 'MA_Crossover', 'MACD'
     * @param {Object} options.params - An object containing both indicator parameters and riskParams (plus other parameters such as optimizationMethod).
     * @param {String} options.symbol - e.g., "BTC/USDT"
     * @param {String} options.timeframe - e.g., "1h"
     * @param {Date|String} options.startDate - Inclusive start date.
     * @param {Date|String} options.endDate - Inclusive end date.
     * @param {Number} [options.initialBalance=10000] - Starting balance in quote currency.
     * @param {Number} [options.positionSize=1.0] - Fraction of balance to risk per trade (1.0 means 100%).
     * @returns {Object} A summary of the backtest including metrics and trade history.
     */
    async run({
                  strategy,
                  params,
                  symbol,
                  timeframe,
                  startDate,
                  endDate,
                  initialBalance = 10000,
                  positionSize = 1.0
              }) {
        try {
            // 1) Validate that the indicator is one of the expected types.
            if (!['RSI', 'MA_Crossover', 'MACD'].includes(strategy)) {
                throw new Error('Invalid strategy. Expected indicator: RSI, MA_Crossover, or MACD.');
            }

            // 2) Fetch historical candle data.
            const candles = await Candle.find({
                symbol: symbol.toUpperCase(),
                timeframe: timeframe.toLowerCase(),
                timestamp: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            }).sort({ timestamp: 1 });
            if (candles.length === 0) {
                throw new Error('No historical data found');
            }

            // 3) Instantiate the indicator instance.
            let indicatorInstance;
            switch (strategy) {
                case 'RSI':
                    indicatorInstance = new RSI(params);
                    break;
                case 'MA_Crossover':
                    indicatorInstance = new MACrossover(params);
                    break;
                case 'MACD':
                    indicatorInstance = new MACD(params);
                    break;
            }

            // 4) Prepare backtest variables.
            let balance = initialBalance; // simulated quote balance
            let openPosition = null;      // tracks an open trade position
            const trades = [];            // record closed trades
            const riskParams = params.riskParams || {};

            // Determine minimum required candles for the indicator.
            const minRequiredCandles =
                strategy === 'RSI'
                    ? (params.period * 2 || 28)
                    : (params.shortPeriod + params.longPeriod || 30);

            // 5) Main backtest loop.
            for (let i = 0; i < candles.length; i++) {
                if (i < minRequiredCandles) continue;
                const relevantCandles = candles.slice(0, i + 1);
                const currentPrice = candles[i].close;
                const currentTime = candles[i].timestamp;

                // Enforce risk limits.
                if (!riskStrategy.enforceRiskLimits(trades, riskParams, balance)) {
                    console.log("Risk limits reached. Stopping backtest.");
                    break;
                }

                // Get the signal from the indicator.
                const signal = indicatorInstance.calculateSignal(relevantCandles);

                // Process BUY/SELL signals.
                if (signal === 'BUY') {
                    // Only open a new position if none is open.
                    if (!openPosition) {
                        const amountToInvest = balance * positionSize;
                        if (amountToInvest <= 0) continue;
                        // Calculate position size using risk strategy (money management).
                        let quantity = riskStrategy.calculatePositionSize(riskParams, balance, currentPrice);
                        // Apply the position size multiplier.
                        quantity *= positionSize;
                        // Compute TP/SL levels.
                        const { TP, SL } = riskStrategy.calculateTPSL(params, currentPrice);
                        openPosition = {
                            entryPrice: currentPrice,
                            sizeInBase: quantity,
                            costInQuote: quantity * currentPrice,
                            entryTime: currentTime,
                            TP,
                            SL
                        };
                        balance -= openPosition.costInQuote;
                        console.log(`Opened BUY at ${currentPrice} with quantity ${quantity}, TP: ${TP}, SL: ${SL}`);
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
                            closedBy: 'SELL signal'
                        });
                        console.log(`Closed trade at ${exitPrice}, profit: ${profit}`);
                        openPosition = null;
                    }
                }
            }

            // 6) Mark-to-market: if a position is still open, close it.
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

            // 7) Optimize parameters using grid (or other method) and get refined risk parameters.
            const optimizedParams = riskStrategy.optimizeParameters(
                symbol,
                timeframe,
                params.optimizationMethod || 'grid',
                candles
            );

            // 8) Build final summary.
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
                metrics: this.calculateMetrics(trades)
            };

            return summary;
        } catch (error) {
            throw new Error(`Backtest failed: ${error.message}`);
        }
    }

    calculateMetrics(trades) {
        const realTrades = trades.filter(t => !t.unrealized);
        if (realTrades.length === 0) {
            return {
                totalPnL: 0,
                winRate: 0,
                avgProfit: 0,
                maxDrawdown: 0
            };
        }
        const totalPnL = realTrades.reduce((sum, t) => sum + t.profit, 0);
        const wins = realTrades.filter(t => t.profit > 0).length;
        const winRate = wins / realTrades.length;
        const avgProfit = totalPnL / realTrades.length;
        return {
            totalPnL,
            winRate,
            avgProfit,
            maxDrawdown: 0
        };
    }
}

module.exports = new BacktestService();
