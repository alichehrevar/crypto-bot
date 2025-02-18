const Candle = require('../models/Candle');
const { RSI, MACrossover, MACD } = require('../indicators');
// Import money management strategies.
const MartingaleStrategy = require('../strategies/moneyManagement/MartingaleStrategy');
const MirroredMartingaleStrategy = require('../strategies/moneyManagement/MirroredMartingaleStrategy');
const KellyCriterionStrategy = require('../strategies/moneyManagement/KellyCriterionStrategy');
// Import refined risk functions.
const riskStrategy = require('../strategies/RiskStrategy');

class BacktestService {
    /**
     * Runs a backtest using a specified strategy.
     *
     * @param {Object} options
     * @param {String} options.strategy - 'RSI', 'MA_Crossover', 'MACD', 'Martingale', 'MirroredMartingale', or 'KellyCriterion'
     * @param {Object} options.params - Strategy parameters (e.g., period, shortPeriod, etc.) plus riskParams and optimizationMethod.
     * @param {String} options.symbol - e.g. "BTC/USDT"
     * @param {String} options.timeframe - e.g. "1h"
     * @param {Date|String} options.startDate - inclusive start date
     * @param {Date|String} options.endDate - inclusive end date
     * @param {Number} [options.initialBalance=10000] - Starting balance
     * @param {Number} [options.positionSize=1.0] - Fraction of balance to risk per trade (1.0 means 100%)
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
                  positionSize = 1.0
              }) {
        try {
            // 1) Validate the requested strategy.
            const validStrategies = ['RSI', 'MA_Crossover', 'MACD', 'Martingale', 'MirroredMartingale', 'KellyCriterion'];
            if (!validStrategies.includes(strategy)) {
                throw new Error('Invalid strategy');
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

            // 3) Instantiate the strategy instance.
            let strategyInstance;
            switch (strategy) {
                case 'RSI':
                    strategyInstance = new RSI(params);
                    break;
                case 'MA_Crossover':
                    strategyInstance = new MACrossover(params);
                    break;
                case 'MACD':
                    strategyInstance = new MACD(params);
                    break;
                case 'Martingale':
                    strategyInstance = new MartingaleStrategy(params);
                    break;
                case 'MirroredMartingale':
                    strategyInstance = new MirroredMartingaleStrategy(params);
                    break;
                case 'KellyCriterion':
                    strategyInstance = new KellyCriterionStrategy(params);
                    break;
            }

            // 4) Prepare backtest variables.
            let balance = initialBalance; // simulated quote currency balance
            let openPosition = null;      // tracks an open trade position
            const trades = [];            // record closed trades
            const riskParams = params.riskParams || {};

            // Determine the minimum required candles for the strategy.
            // For indicator strategies, use indicator-specific requirements.
            // For money management strategies, you may assume signals are externally generated (i.e., always 'HOLD').
            let minRequiredCandles;
            if (['RSI', 'MACD'].includes(strategy)) {
                minRequiredCandles = params.period ? params.period * 2 : 28;
            } else if (strategy === 'MA_Crossover') {
                minRequiredCandles = (params.shortPeriod && params.longPeriod) ? (params.shortPeriod + params.longPeriod) : 30;
            } else {
                // For money management strategies, we might simulate signals externally.
                minRequiredCandles = 1;
            }

            // 5) Main backtest loop.
            for (let i = 0; i < candles.length; i++) {
                if (i < minRequiredCandles) continue;
                const relevantCandles = candles.slice(0, i + 1);
                const currentPrice = candles[i].close;
                const currentTime = candles[i].timestamp;

                // Check if an open position has hit TP/SL.
                if (openPosition) {
                    if (currentPrice >= openPosition.TP || currentPrice <= openPosition.SL) {
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
                            closedBy: 'TP/SL'
                        });
                        console.log(`Trade closed by TP/SL for position entered at ${openPosition.entryPrice}. Exit: ${exitPrice}, Profit: ${profit}`);
                        openPosition = null;
                        continue;
                    }
                }

                // Enforce risk limits.
                if (!riskStrategy.enforceRiskLimits(trades, riskParams, balance)) {
                    console.log("Risk limits reached. Stopping backtest.");
                    break;
                }

                // Get signal from the strategy.
                const signal = strategyInstance.calculateSignal(relevantCandles);
                // For money management strategies that don't generate signals, you may choose to override signal logic externally.
                // (For this example, we assume they return 'HOLD' by default.)

                if (signal === 'BUY') {
                    if (!openPosition) {
                        const amountToInvest = balance * positionSize;
                        if (amountToInvest <= 0) continue;
                        // For money management strategies, the calculatePositionSize might require additional parameters (e.g., lastTradeOutcome).
                        let quantity;
                        if (typeof strategyInstance.calculatePositionSize === 'function') {
                            // Check function arity to decide how to call it.
                            if (strategyInstance.calculatePositionSize.length === 3) {
                                // Assume it expects (lastTradeOutcome, balance, price). For backtesting, assume last trade was a win.
                                quantity = strategyInstance.calculatePositionSize('win', balance, currentPrice);
                            } else {
                                // Otherwise, assume it expects (balance, price).
                                quantity = strategyInstance.calculatePositionSize(balance, currentPrice);
                            }
                        } else {
                            // Fallback: use riskStrategy's default calculation.
                            quantity = riskStrategy.calculatePositionSize(riskParams, balance, currentPrice);
                        }
                        // Compute TP/SL levels.
                        const { TP, SL } = riskStrategy.calculateTPSL(params, currentPrice);
                        openPosition = {
                            entryPrice: currentPrice,
                            sizeInBase: quantity,
                            costInQuote: quantity * currentPrice,
                            entryTime: currentTime,
                            TP, // take profit level
                            SL  // stop loss level
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
                        console.log(`Closed trade via SELL signal: Entry: ${openPosition.entryPrice}, Exit: ${exitPrice}, Profit: ${profit}`);
                        openPosition = null;
                    }
                }
            }

            // 6) Mark-to-market if a position remains open.
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

            // 7) Optimize parameters based on historical performance.
            const optimizedParams = riskStrategy.optimizeParameters(
                symbol,
                timeframe,
                params.optimizationMethod || 'weighted',
                candles
            );

            // 8) Build and return a summary.
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

    /**
     * Calculates basic metrics from closed trades.
     */
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
