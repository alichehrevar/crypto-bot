const Candle = require('../models/Candle');
const { RSI, MACrossover } = require('../indicators');
// Import the risk strategy functions.
const riskStrategy = require('../RiskStrategy');

class BacktestService {
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
            // 1) Validate strategy.
            if (!['RSI', 'MA_Crossover'].includes(strategy)) {
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
            }

            // 4) Prepare for backtesting.
            let balance = initialBalance;
            let openPosition = null;
            const trades = [];

            const minRequiredCandles = strategy === 'RSI'
                ? (params.period * 2 || 28)
                : (params.shortPeriod + params.longPeriod || 30);

            // 5) Main backtest loop.
            for (let i = 0; i < candles.length; i++) {
                if (i < minRequiredCandles) continue;

                const relevantCandles = candles.slice(0, i + 1);

                // Enforce risk limits (stub check).
                if (!riskStrategy.enforceRiskLimits(balance, params.riskParams)) {
                    console.log("Risk limits exceeded. Stopping backtest.");
                    break;
                }

                const signal = strategyInstance.calculateSignal(relevantCandles);
                const currentPrice = candles[i].close;
                const currentTime = candles[i].timestamp;

                if (signal === 'BUY') {
                    if (!openPosition) {
                        // Calculate position size using risk module.
                        const amountToInvest = balance * positionSize;
                        if (amountToInvest <= 0) continue;
                        const quantity = riskStrategy.calculatePositionSize(params.riskParams, balance, currentPrice);
                        openPosition = {
                            entryPrice: currentPrice,
                            sizeInBase: quantity,
                            costInQuote: quantity * currentPrice,
                            entryTime: currentTime
                        };
                        balance -= openPosition.costInQuote;
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
                            duration: currentTime - openPosition.entryTime
                        });
                        openPosition = null;
                    }
                }
            }

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

            // (Optional) Optimize parameters.
            const optimizedParams = riskStrategy.optimizeParameters(symbol, timeframe, params.optimizationMethod || 'weighted');

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
