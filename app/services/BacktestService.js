const Candle = require('../models/Candle');
const { RSI, MACrossover } = require('../strategies');

class BacktestService {
    async run({
                  strategy,
                  params,
                  symbol,
                  timeframe,
                  startDate,
                  endDate,
                  initialBalance = 10000
              }) {
        try {
            // Parameter validation
            if (!['RSI', 'MA_Crossover'].includes(strategy)) {
                throw new Error('Invalid strategy');
            }

            // Get candles
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

            // Initialize strategy
            let strategyInstance;
            switch(strategy) {
                case 'RSI':
                    strategyInstance = new RSI(params);
                    break;
                case 'MA_Crossover':
                    strategyInstance = new MACrossover(params);
                    break;
            }

            // Backtest logic
            let balance = initialBalance;
            let position = null;
            const trades = [];

            for (let i = params.period || 50; i < candles.length; i++) {
                const currentCandles = candles.slice(0, i + 1);
                const signal = strategyInstance.calculateSignal(currentCandles);
                const currentPrice = candles[i].close;

                if (signal === 'BUY' && !position) {
                    position = {
                        entryPrice: currentPrice,
                        entryTime: candles[i].timestamp,
                        size: balance
                    };
                    balance = 0;
                } else if (signal === 'SELL' && position) {
                    const profit = currentPrice - position.entryPrice;
                    balance = position.size * (1 + profit/position.entryPrice);
                    trades.push({
                        profit,
                        duration: candles[i].timestamp - position.entryTime,
                        entry: position.entryPrice,
                        exit: currentPrice
                    });
                    position = null;
                }
            }

            // Calculate metrics
            return {
                initialBalance,
                finalBalance: balance + (position ? position.size : 0),
                totalTrades: trades.length,
                profitableTrades: trades.filter(t => t.profit > 0).length,
                metrics: this.calculateMetrics(trades)
            };

        } catch (error) {
            throw new Error(`Backtest failed: ${error.message}`);
        }
    }

    calculateMetrics(trades) {
        // Add metric calculations here
        return {};
    }
}

module.exports = new BacktestService();
