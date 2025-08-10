// app/services/backtestService/BacktestService.js
const BacktestOrderSimulator  = require('./BacktestOrderSimulator');
const BacktestSignalProcessor = require('./BacktestSignalProcessor');
const calculateMetrics        = require('./BacktestMetricsCalculator');
const { enforceRiskLimits }   = require('./riskUtils');
const BacktestRiskManager     = require('./BacktestRiskManager');
const BacktestRun             = require('../../models/BacktestRun');

class BacktestService {
    constructor({ candleProvider }) {
        this.candleProvider = candleProvider;
    }

    async run(opts) {
        const {
            userId, symbol, strategies = [], initialBalance = 10000, from, to,
            mode, recentCount, optimize = false, optimizationMethod = 'grid',
            minAccuracy, minTrades, risk
        } = opts;

        const results = [];

        for (const strat of strategies) {
            let { indicator, timeframe, params = {}, riskParams = {}, paramSpace = {} } = strat;

            const candles = await this.candleProvider(symbol, timeframe, from, to);
            if (!candles || candles.length === 0) {
                console.warn(`[BacktestService] No candles for ${symbol} on ${timeframe}.`);
                continue;
            }

            let bestParams = params;
            if (optimize) {
                const optimizationOptions = { initialBalance, risk: riskParams, minAccuracy, minTrades };
                const optimized = await BacktestRiskManager.optimizeParameters(
                    symbol,
                    [{ indicator, timeframe, params, paramSpace }],
                    optimizationMethod,
                    candles,
                    optimizationOptions
                );
                bestParams = { ...params, ...optimized };
            }

            const signaler  = new BacktestSignalProcessor(indicator, bestParams);
            const simulator = new BacktestOrderSimulator({ initialBalance, riskParams, equityCurve: [initialBalance] });

            for (const candle of candles) {
                const signal = signaler.next(candle);
                simulator.step(candle, signal);

                const unreal = simulator.equityCurve[simulator.equityCurve.length - 1] - simulator.balance;
                const keepTrading = enforceRiskLimits(
                    simulator.trades, riskParams, simulator.equityCurve, new Date(candle.time), unreal
                );
                if (!keepTrading) break;
            }

            const last = candles[candles.length - 1];
            simulator.closeFinal(last.close, last.time);

            const metrics = calculateMetrics({
                trades: simulator.trades, equityCurve: simulator.equityCurve, initialBalance
            });

            // 👉 include candles + the (possibly) optimized params
            results.push({
                indicator,
                timeframe,
                params: bestParams,
                metrics,
                trades: simulator.trades,
                candles,                     // <— added
            });
        }

        const primaryResult = results[0] || {};
        const finalMetrics = primaryResult.metrics || {};
        const finalTrades = primaryResult.trades || [];

        const runRecord = await BacktestRun.create({
            userId, symbol, mode, recentCount, startDate: from, endDate: to,
            indicators: strategies.map(s => ({ indicator: s.indicator, timeframe: s.timeframe, params: s.params })),
            optimize, optimizationMethod, minAccuracy, minTrades, useRisk: !!risk, riskOptions: risk,
            initialBalance, finalBalance: finalMetrics.finalBalance || initialBalance,
            metrics: finalMetrics, trades: finalTrades, // (don’t store candles in DB to keep it light)
        });

        return { runId: runRecord._id, strategies: results };
    }
}

module.exports = BacktestService;
