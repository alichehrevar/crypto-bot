const Candle = require('../models/Candle');
const { RSI, MACrossover } = require('../indicators');

class BacktestService {
    /**
     * Runs a backtest using one of the known indicators (RSI, MA_Crossover).
     * @param {Object} options
     * @param {String} options.strategy - 'RSI' or 'MA_Crossover'
     * @param {Object} options.params - strategy parameters (e.g., period, etc.)
     * @param {String} options.symbol - e.g. "BTC/USDT"
     * @param {String} options.timeframe - e.g. "1h"
     * @param {Date|String} options.startDate - inclusive
     * @param {Date|String} options.endDate - inclusive
     * @param {Number} [options.initialBalance=10000]
     * @param {Number} [options.positionSize=1.0] - fraction of current balance to risk per trade
     * @returns {Object} summary - object containing final results
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
            // 1) Validate the requested strategy
            if (!['RSI', 'MA_Crossover'].includes(strategy)) {
                throw new Error('Invalid strategy');
            }

            // 2) Fetch historical candle data
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

            // 3) Instantiate the strategy
            let strategyInstance;
            switch (strategy) {
                case 'RSI':
                    strategyInstance = new RSI(params);
                    break;
                case 'MA_Crossover':
                    strategyInstance = new MACrossover(params);
                    break;
                // Add other indicators if needed
            }

            // 4) Prepare for backtest
            let balance = initialBalance;    // Our "cash" (quote currency)
            let openPosition = null;         // Tracks an open position (if any)
            const trades = [];               // Keep a record of all closed trades

            // Determine minimum required candles before we can get a signal
            // E.g., RSI might need period * 2 or something. For safety we offset by a bit.
            const minRequiredCandles = strategy === 'RSI'
                ? (params.period * 2 || 28)   // example for RSI
                : (params.shortPeriod + params.longPeriod || 30); // for MA_Crossover

            // 5) Main backtest loop
            for (let i = 0; i < candles.length; i++) {
                // Ensure we have enough candles to generate a valid signal
                if (i < minRequiredCandles) {
                    continue;
                }

                // Sub-array [0..i] is the historical data up to the current index
                // But to avoid performance overhead, you could pass the entire array and let the strategy handle the index
                const relevantCandles = candles.slice(0, i + 1);

                // Get the signal
                const signal = strategyInstance.calculateSignal(relevantCandles);

                // Current price/candle
                const currentPrice = candles[i].close;
                const currentTime = candles[i].timestamp;

                // Basic "all in, all out" logic with partial sizing factor
                //  -- openPosition is { entryPrice, sizeInBase, costInQuote, entryTime }
                //  -- "sizeInBase" is how many units of the base currency we hold

                if (signal === 'BUY') {
                    // Only open a position if none is open
                    if (!openPosition) {
                        // Decide how much quote balance to risk
                        // E.g., positionSize=1 => 100% of balance, 0.5 => 50% of balance, etc.
                        const amountToInvest = balance * positionSize;
                        if (amountToInvest <= 0) continue;

                        // Convert that quote amount to base currency
                        const sizeInBase = amountToInvest / currentPrice;

                        openPosition = {
                            entryPrice: currentPrice,
                            sizeInBase: sizeInBase,
                            costInQuote: amountToInvest,   // track how much "cash" we spent
                            entryTime: currentTime
                        };

                        // Deduct from our balance
                        balance -= amountToInvest;
                    }
                } else if (signal === 'SELL') {
                    // If a position is open, close it
                    if (openPosition) {
                        // Sell all base currency at currentPrice => realize profit/loss
                        const exitPrice = currentPrice;
                        const positionValue = openPosition.sizeInBase * exitPrice;
                        const profit = positionValue - openPosition.costInQuote;

                        // Increase our balance by positionValue
                        balance += positionValue;

                        // Store trade details
                        trades.push({
                            entry: openPosition.entryPrice,
                            exit: exitPrice,
                            profit,  // in quote currency
                            entryTime: openPosition.entryTime,
                            exitTime: currentTime,
                            duration: currentTime - openPosition.entryTime
                        });

                        // Position is now closed
                        openPosition = null;
                    }
                }
            }

            // 6) If we still have an open position at the end, mark-to-market
            let finalBalance = balance;
            if (openPosition) {
                const lastPrice = candles[candles.length - 1].close;
                const positionValue = openPosition.sizeInBase * lastPrice;
                const unrealizedProfit = positionValue - openPosition.costInQuote;
                finalBalance += positionValue;

                // Optional: record a "virtual close" trade if you want to see final outcome
                trades.push({
                    entry: openPosition.entryPrice,
                    exit: lastPrice,
                    profit: unrealizedProfit,
                    entryTime: openPosition.entryTime,
                    exitTime: candles[candles.length - 1].timestamp,
                    duration: candles[candles.length - 1].timestamp - openPosition.entryTime,
                    unrealized: true  // Mark that this was not an actual 'SELL' signal
                });

                openPosition = null;
            }

            // 7) Build final metrics
            const summary = {
                strategy,
                params,
                symbol,
                timeframe,
                initialBalance,
                finalBalance,
                totalTrades: trades.filter(t => !t.unrealized).length, // only count actual SELL signals
                trades, // you can omit this if you'd rather not return all trades
                metrics: this.calculateMetrics(trades)
            };

            return summary;

        } catch (error) {
            throw new Error(`Backtest failed: ${error.message}`);
        }
    }

    /**
     * Example: compute basic metrics from the closed trades array.
     */
    calculateMetrics(trades) {
        // Filter real trades (excl. unrealized final "close")
        const realTrades = trades.filter(t => !t.unrealized);
        if (realTrades.length === 0) {
            return {
                totalPnL: 0,
                winRate: 0,
                avgProfit: 0,
                maxDrawdown: 0  // implementing maxDrawdown requires tracking equity over time
            };
        }

        const totalPnL = realTrades.reduce((sum, t) => sum + t.profit, 0);
        const wins = realTrades.filter(t => t.profit > 0).length;
        const losses = realTrades.filter(t => t.profit < 0).length;
        const winRate = wins / realTrades.length;
        const avgProfit = totalPnL / realTrades.length;

        // Max drawdown is more involved. You typically track equity after each candle,
        // then find the largest peak-to-trough drop. This code doesn't do that.
        // We'll just return 0 for now.

        return {
            totalPnL,
            winRate,
            avgProfit,
            maxDrawdown: 0
        };
    }
}

module.exports = new BacktestService();
