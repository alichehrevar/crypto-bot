// app/services/backtestService/BacktestService.js

const axios            = require('axios');
const BacktestRun      = require('../../models/BacktestRun');
const {simulateWholeStrategy} = require("../../strategies/optimization/sharedSimulation");

class BacktestService {
    /**
     * @param {Object} opts
     * @param {string} opts.userId
     * @param {string} opts.symbol
     * @param {'recent'|'range'} opts.mode
     * @param {number} [opts.recentCount]
     * @param {string} [opts.startDate]
     * @param {string} [opts.endDate]
     * @param {Array<{indicator:string, timeframe:string, params:Object}>} opts.indicators
     * @param {boolean} [opts.optimize]
     * @param {'grid'|'bayesian'|'ann'} [opts.optimizationMethod]
     * @param {number} [opts.minAccuracy]
     * @param {number} [opts.minTrades]
     * @param {Object} [opts.risk]
     * @param {number} [opts.initialBalance]
     */
    async run(opts) {
        // --- FIX 1: Define all variables at the top ---
        const optimizeFlag = opts.optimize === true;
        const initBal = Number(opts.initialBalance) || 10000;
        const userRisk = opts.risk ? (typeof opts.risk === 'string' ? JSON.parse(opts.risk) : opts.risk) : {};
        const { userId, symbol, mode, recentCount, startDate, endDate, indicators, optimizationMethod } = opts;
        const minTradesNum = Number(opts.minTrades) || 0;
        const minAccNum = Number(opts.minAccuracy) || 0;
        const pair = symbol.replace('/', '').toUpperCase();

        // 1) fetch candles in parallel (Your existing code is correct)
        const candlesMap = {};
        await Promise.all(indicators.map(async ({ timeframe }) => {
            let all = [];
            if (mode === 'recent') {
                const { data } = await axios.get(
                    'https://api.binance.com/api/v3/klines',
                    { params: { symbol: pair, interval: timeframe, limit: recentCount } }
                );
                all = data.map(k => ({
                    timestamp: new Date(k[0]),
                    open: +k[1], high: +k[2], low: +k[3],
                    close: +k[4], volume: +k[5]
                }));
            } else {
                let from = new Date(startDate).getTime();
                const endMs = new Date(endDate).getTime();
                while (from < endMs) {
                    const { data } = await axios.get(
                        'https://api.binance.com/api/v3/klines',
                        { params: { symbol: pair, interval: timeframe, startTime: from, endTime: endMs, limit: 1000 } }
                    );
                    const batch = data.map(k => ({
                        timestamp: new Date(k[0]),
                        open: +k[1], high: +k[2], low: +k[3],
                        close: +k[4], volume: +k[5]
                    }));
                    if (!batch.length) break;
                    all.push(...batch);
                    from = batch[batch.length - 1].timestamp.getTime() + 1;
                }
            }
            if (!all.length) {
                throw new Error(`No data for timeframe ${timeframe}`);
            }
            candlesMap[timeframe] = all;
        }));

        // 2) helper: run one indicator backtest
        const runSingle = (indicator, params, candles) => {
            const options = { initialBalance: initBal, risk: userRisk };
            return simulateWholeStrategy(indicator, params, candles, options);
        };

        const rawResults = indicators.map(({ indicator, timeframe, params, paramSpace }) => {
            const out = runSingle(indicator, params, candlesMap[timeframe]);
            return { indicator, timeframe, params, paramSpace, ...out };
        });

        const base = rawResults[0];

        // --- FIX 2: Add fallback for PnL to prevent NaN ---
        const finalPnL = base.totalPnL || 0;
        const finalWinRate = base.winRate || 0;

        // 4) persist summary
        const record = await BacktestRun.create({
            userId,
            symbol,
            mode,
            recentCount: mode === 'recent' ? recentCount : undefined,
            startDate: mode === 'range' ? new Date(startDate) : undefined,
            endDate: mode === 'range' ? new Date(endDate) : undefined,
            indicators: opts.indicators,
            optimize: optimizeFlag,
            optimizationMethod,
            minAccuracy: minAccNum, // Now defined
            minTrades: minTradesNum,   // Now defined
            useRisk: !!opts.risk,
            riskOptions: userRisk,
            initialBalance: initBal,
            finalBalance: initBal + finalPnL, // Safely calculated
            metrics: { totalPnL: finalPnL, winRate: finalWinRate } // Safely calculated
        });

        // 5) build optimizedParams (start raw)
        let optimizedParams = rawResults.map(r => ({
            indicator: r.indicator,
            timeframe: r.timeframe,
            bestParam: r.params,
            simulatedTrades: r.totalTrades,
            avgTradeDuration: r.avgTradeDuration || 0,
            winRate: r.winRate || 0,
            pnlUsd: r.totalPnL || 0
        }));

        // 6) if optimize → re-run
        if (optimizeFlag) {
            const riskManager = require('./BacktestRiskManager'); // This can be moved to the top now
            await Promise.all(rawResults.map(async (r, i) => {
                const bestParams = await riskManager.optimizeParameters(
                    symbol,
                    [{ ...r }],
                    optimizationMethod,
                    candlesMap[r.timeframe],
                    { initialBalance: initBal, risk: userRisk }
                );

                const re = runSingle(r.indicator, { ...r.params, ...bestParams }, candlesMap[r.timeframe]);

                // Also add safety fallbacks here
                optimizedParams[i] = {
                    ...optimizedParams[i],
                    bestParam: { ...r.params, ...bestParams },
                    simulatedTrades: re.totalTrades || 0,
                    avgTradeDuration: re.avgTradeDuration || 0,
                    winRate: re.winRate || 0,
                    pnlUsd: re.totalPnL || 0,
                };
            }));
        }

        // 7) return full payload
        return {
            runId: record._id,
            symbol: record.symbol,
            summary: {
                initialBalance: initBal,
                finalBalance: initBal + finalPnL,
                totalTrades: base.totalTrades || 0,
                metrics: { totalPnL: finalPnL, winRate: finalWinRate }
            },
            optimizedParams
        };
    }
}

module.exports = new BacktestService();
