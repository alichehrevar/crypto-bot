// services/backtestService/BacktestService.js

const Candle = require('../../models/Candle');
// Import indicator classes from the indicators directory.
const { RSI, MACrossover, MACD } = require('../../indicators');
// Import our unified risk management module from the strategies directory.
const riskManagement = require('../../strategies/RiskManagement');

/**
 * BacktestService simulates a trading strategy over historical data.
 */
class BacktestService {
    /**
     * Runs a backtest using a specified indicator.
     *
     * @param {Object} options - Options for the backtest.
     * @param {String} options.strategy - One of: 'RSI', 'MA_Crossover', 'MACD'.
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
            // Validate strategy.
            if (!['RSI', 'MA_Crossover', 'MACD'].includes(strategy)) {
                throw new Error('Invalid strategy');
            }

            // Fetch historical candles.
            const candles = await Candle.find({
                symbol: symbol.toUpperCase(),
                timeframe: timeframe.toLowerCase(),
                timestamp: { $gte: new Date(startDate), $lte: new Date(endDate) }
            }).sort({ timestamp: 1 });

            if (candles.length === 0) {
                throw new Error('No historical data found');
            }

            // Instantiate the indicator.
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

            // Prepare backtest variables.
            let balance = initialBalance;    // simulated quote currency balance
            let openPosition = null;         // tracks an open trade
            const trades = [];               // records closed trades
            const riskParams = params.riskParams || {};

            // Determine the minimum number of candles needed for the indicator to generate a signal.
            const minRequiredCandles = strategy === 'RSI'
                ? (params.period * 2 || 28)
                : (params.shortPeriod + params.longPeriod || 30);

            // Backtest loop: iterate over historical candles.
            for (let i = 0; i < candles.length; i++) {
                if (i < minRequiredCandles) continue;
                const relevantCandles = candles.slice(0, i + 1);
                const currentPrice = candles[i].close;
                const currentTime = candles[i].timestamp;

                // Enforce risk limits.
                if (!riskManagement.enforceRiskLimits(trades, riskParams, balance)) {
                    console.log("Risk limits reached. Stopping backtest.");
                    break;
                }

                // Get trading signal from the indicator.
                const signal = strategyInstance.calculateSignal(relevantCandles);

                // Simulate order execution based on signal.
                if (signal === 'BUY') {
                    if (!openPosition) {
                        const amountToInvest = balance * positionSize;
                        if (amountToInvest <= 0) continue;
                        let quantity = riskManagement.calculatePositionSize(riskParams, balance, currentPrice);
                        quantity *= positionSize;
                        // Calculate TP/SL levels.
                        const { TP, SL } = riskManagement.calculateTPSL(params, currentPrice);
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
                        console.log(`Closed trade via SELL signal: Entry: ${openPosition.entryPrice}, Exit: ${exitPrice}, Profit: ${profit}`);
                        openPosition = null;
                    }
                }
            }

            // Mark-to-market: if a position remains open, simulate closing it at the last candle.
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

            // Optimize parameters using the unified risk management optimization method.
            const optimizedParams = riskManagement.optimizeParameters(
                symbol,
                timeframe,
                params.optimizationMethod || 'grid',
                candles
            );

            // Compute basic metrics (for example, using a separate module if needed).
            const totalRealTrades = trades.filter(t => !t.unrealized).length;
            const totalPnL = trades.filter(t => !t.unrealized).reduce((sum, t) => sum + t.profit, 0);
            const summary = {
                strategy,
                params,
                optimizedParams,
                symbol,
                timeframe,
                initialBalance,
                finalBalance: balance,
                totalTrades: totalRealTrades,
                trades,
                metrics: {
                    totalPnL,
                    // Additional metrics can be added here (win rate, avg profit, max drawdown, etc.)
                }
            };

            return summary;
        } catch (error) {
            throw new Error(`Backtest failed: ${error.message}`);
        }
    }
}

module.exports = new BacktestService();
