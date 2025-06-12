// app/services/backtestService/BacktestService.js

const axios = require('axios');
const BacktestRun = require('../../models/BacktestRun');
const riskManager = require('./BacktestRiskManager');
const { simulateWholeStrategy } = require('../../strategies/optimization/sharedSimulation');

class BacktestService {
    async run(opts) {
        // 0) parse & coerce
        const optimizeFlag = opts.optimize === true || opts.optimize === 'true';
        const minTradesNum = Number(opts.minTrades) || 0;
        const minAccNum    = Number(opts.minAccuracy) || 0;
        const initBal      = Number(opts.initialBalance) || 10000;
        const userRisk     = opts.risk
            ? (typeof opts.risk === 'string' ? JSON.parse(opts.risk) : opts.risk)
            : {};

        const {
            userId, symbol, mode,
            recentCount, startDate, endDate,
            indicators, optimizationMethod
        } = opts;

        const pair = symbol.replace('/', '').toUpperCase();

        // 1) fetch candles for each timeframe
        const candlesMap = {};
        await Promise.all(indicators.map(async cfg => {
            const tf = cfg.timeframe;
            let all = [];

            if (mode === 'recent') {
                const resp = await axios.get('https://api.binance.com/api/v3/klines', {
                    params: { symbol: pair, interval: tf, limit: recentCount }
                });
                all = resp.data.map(k => ({
                    timestamp: new Date(k[0]),
                    open:  +k[1], high: +k[2], low:  +k[3],
                    close: +k[4], volume: +k[5]
                }));
            } else {
                const startMs = new Date(startDate).getTime();
                const endMs   = new Date(endDate).getTime();
                let from = startMs;
                while (from < endMs) {
                    const resp = await axios.get('https://api.binance.com/api/v3/klines', {
                        params: { symbol: pair, interval: tf, startTime: from, endTime: endMs, limit: 1000 }
                    });
                    const batch = resp.data.map(k => ({
                        timestamp: new Date(k[0]),
                        open:  +k[1], high: +k[2], low:  +k[3],
                        close: +k[4], volume: +k[5]
                    }));
                    if (!batch.length) break;
                    all.push(...batch);
                    from = batch[batch.length - 1].timestamp.getTime() + 1;
                }
            }

            if (!all.length) {
                throw new Error(`No data for timeframe ${tf}`);
            }
            candlesMap[tf] = all;
        }));

        // 2) raw backtests via sharedSimulation
        const rawResults = indicators.map(cfg => {
            const { totalPnL, totalTrades, winRate } = simulateWholeStrategy(
                cfg.indicator,
                cfg.params,
                candlesMap[cfg.timeframe]
            );
            return {
                cfg,
                pnl:         totalPnL,
                totalTrades,
                winRate
            };
        });

        // 3) save summary record
        const record = await BacktestRun.create({
            userId,
            symbol,
            mode,
            recentCount:    mode === 'recent' ? recentCount : undefined,
            startDate:      mode === 'range'  ? new Date(startDate) : undefined,
            endDate:        mode === 'range'  ? new Date(endDate)   : undefined,
            indicators:     opts.indicators,
            optimize:       optimizeFlag,
            optimizationMethod,
            minAccuracy:    minAccNum,
            minTrades:      minTradesNum,
            useRisk:        !!opts.risk,
            riskOptions:    userRisk,
            initialBalance: initBal,
            finalBalance:   initBal + rawResults[0].pnl,
            metrics:        { totalPnL: rawResults[0].pnl }
        });

        // 4) build initial optimizedParams table (same as raw)
        let optimizedParams = rawResults.map(({ cfg, pnl }) => ({
            indicator: cfg.indicator,
            timeframe: cfg.timeframe,
            bestParam: cfg.params,
            pnlUsd:    pnl
        }));

        // 5) if optimizing, run parameter optimization per indicator
        if (optimizeFlag) {
            await Promise.all(rawResults.map(async ({ cfg, totalTrades, winRate }, i) => {
                let bestParams = cfg.params;

                // only optimize if raw meets thresholds
                if (totalTrades >= minTradesNum && winRate * 100 >= minAccNum) {
                    // run optimizer (pass an array of one cfg)
                    const optimized = await riskManager.optimizeParameters(
                        symbol,
                        [ cfg ],
                        optimizationMethod,
                        candlesMap[cfg.timeframe]
                    );

                    // merge the found riskFraction (or whatever)
                    bestParams = {
                        ...cfg.params,
                        ...(optimized || {})
                    };

                    // re-simulate with optimized params
                    const { totalPnL: newPnl } = simulateWholeStrategy(
                        cfg.indicator,
                        bestParams,
                        candlesMap[cfg.timeframe]
                    );

                    optimizedParams[i] = {
                        indicator:   cfg.indicator,
                        timeframe:   cfg.timeframe,
                        bestParam:   bestParams,
                        pnlUsd:      newPnl,
                        totalTrades,
                        winRate
                    };
                }
            }));
        }

        // 6) return combined result
        return {
            runId:          record._id,
            symbol:         record.symbol,
            summary: {
                initialBalance: initBal,
                finalBalance:   initBal + rawResults[0].pnl,
                totalTrades:    rawResults[0].totalTrades,
                metrics:        { totalPnL: rawResults[0].pnl }
            },
            trades:         [], // detailed trades omitted
            optimizedParams
        };
    }
}

module.exports = new BacktestService();
