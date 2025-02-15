const Candle = require('../models/Candle');
const { RSI, MACrossover, MACD } = require('../indicators');
// Import refined risk functions.
const riskStrategy = require('../strategies/RiskStrategy');

class BacktestService {
    /**
     * Runs a backtest using a specified indicator (e.g., RSI, MA_Crossover, or MACD).
     *
     * @param {Object} options
     * @param {String} options.strategy - 'RSI', 'MA_Crossover', or 'MACD'
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
            if (!['RSI', 'MA_Crossover', 'MACD'].includes(strategy)) {
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

            // 3) Instantiate the indicator.
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
            }

            // 4) Prepare backtest variables.
            let balance = initialBalance; // simulated quote currency balance
            let openPosition = null;      // tracks an open trade position
            const trades = [];            // record closed trades
            const riskParams = params.riskParams || {};

            // Determine the minimum required candles for the indicator.
            const minRequiredCandles = strategy === 'RSI'
                ? (params.period * 2 || 28)
                : (params.shortPeriod + params.longPeriod || 30);

            // 5) Main backtest loop.
            for (let i = 0; i < candles.length; i++) {
                if (i < minRequiredCandles) continue;
                const relevantCandles = candles.slice(0, i + 1);
                const currentPrice = candles[i].close;
                const currentTime = candles[i].timestamp;

                // If a position is open, check for TP/SL triggers.
                if (openPosition) {
                    if (currentPrice >= openPosition.TP || currentPrice <= openPosition.SL) {
                        // Close the trade due to TP/SL being hit.
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
                        // Skip further processing on this candle.
                        continue;
                    }
                }

                // Enforce risk limits.
                if (!riskStrategy.enforceRiskLimits(trades, riskParams, balance)) {
                    console.log("Risk limits reached. Stopping backtest.");
                    break;
                }

                // Get the signal from the indicator.
                const signal = strategyInstance.calculateSignal(relevantCandles);

                // Simulate trade entry and exit based on indicator signal.
                if (signal === 'BUY') {
                    // Only open a new position if none is open.
                    if (!openPosition) {
                        const amountToInvest = balance * positionSize;
                        if (amountToInvest <= 0) continue;
                        // Calculate position size using the risk strategy module.
                        const quantity = riskStrategy.calculatePositionSize(riskParams, balance, currentPrice);
                        // Compute TP/SL levels using the risk strategy module.
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
                        console.log(`Opened BUY at ${currentPrice} with TP: ${TP} and SL: ${SL}`);
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
     * Calculates basic metrics from the closed trades.
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
