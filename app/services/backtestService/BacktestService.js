// app/services/backtestService/BacktestService.js

const axios = require('axios');
const {
    processSignal
} = require('./BacktestSignalProcessor');
const riskManager = require('./BacktestRiskManager');
const {
    simulateOrder,
    closeFinal
} = require('./BacktestOrderSimulator');
const {
    calculateMetrics
} = require('./BacktestMetricsCalculator');

class BacktestService {
    /**
     * Runs a live-sourced backtest.
     *
     * @param {Object} opts
     * @param {String} opts.symbol           e.g. "BTC/USDT"
     * @param {String} opts.mode             "recent" or "range"
     * @param {Number} [opts.recentCount]    # of bars if mode="recent"
     * @param {Date|string} [opts.startDate] only if mode="range"
     * @param {Date|string} [opts.endDate]
     * @param {Array<{indicator, timeframe, params}>} opts.indicators
     * @param {Boolean} opts.optimize
     * @param {"grid"|"bayesian"|"ann"} [opts.optimizationMethod]
     * @param {Number} [opts.minAccuracy]    % minimum win‐rate to run optimization
     * @param {Number} [opts.minTrades]      minimum closed trades to optimize
     * @param {Object} [opts.risk]           { investment, leverage, takeProfitPct, stopLossPct }
     * @param {Number} [opts.initialBalance=10000]
     */
    async run(opts) {
        const {
            symbol,
            mode,
            recentCount,
            startDate,
            endDate,
            indicators,
            optimize,
            optimizationMethod,
            minAccuracy = 0,
            minTrades   = 0,
            risk,
            initialBalance = 10000
        } = opts;

        // 1) Fetch candles from Binance
        const pair = symbol.replace('/','').toUpperCase();
        let candles = [];

        if (mode === 'recent') {
            const resp = await axios.get('https://api.binance.com/api/v3/klines', {
                params: { symbol: pair, interval: indicators[0].timeframe, limit: recentCount }
            });
            candles = resp.data.map(k => ({
                timestamp: new Date(k[0]),
                open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5]
            }));
        } else {
            const startMs = new Date(startDate).getTime();
            const endMs   = new Date(endDate).getTime();
            let from = startMs;
            do {
                const resp = await axios.get('https://api.binance.com/api/v3/klines', {
                    params: {
                        symbol:    pair,
                        interval:  indicators[0].timeframe,
                        startTime: from,
                        endTime:   endMs,
                        limit:     1000
                    }
                });
                const batch = resp.data.map(k => ({
                    timestamp: new Date(k[0]),
                    open: +k[1], high:+k[2], low:+k[3], close:+k[4], volume:+k[5]
                }));
                if (!batch.length) break;
                candles.push(...batch);
                from = batch[batch.length-1].timestamp.getTime() + 1;
            } while (from < endMs);
        }

        if (!candles.length) {
            throw new Error('No candle data fetched for backtest');
        }

        // 2) Simulation loop
        let balance      = initialBalance;
        let openPosition = null;
        const trades     = [];

        for (let i = 0; i < candles.length; i++) {
            const slice = candles.slice(0, i+1);
            const now   = candles[i].timestamp;
            const price = candles[i].close;

            // risk guard
            if (!riskManager.enforceRiskLimits(trades, risk, balance)) break;

            // generate signal from first indicator only (could extend to multiple)
            const { indicator, params: indParams } = indicators[0];
            const signal = processSignal(slice, indicator, indParams);

            // prepare position-sizing and TP/SL
            const calcSize = risk
                ? () => (risk.investment * (risk.leverage||1)) / price
                : (bal, pr) => riskManager.calculatePositionSize(indParams.riskParams, bal, pr);

            const calcTPSL = risk
                ? () => ({
                    TP: price * (1 + (risk.takeProfitPct||2)/100),
                    SL: price * (1 - (risk.stopLossPct||2)/100)
                })
                : ep => riskManager.calculateTPSL(indParams, ep);

            // simulate
            const { openPosition: np, balance: nb, tradeRecord } =
                simulateOrder({
                    balance,
                    currentPrice: price,
                    currentTime:  now,
                    signal,
                    openPosition,
                    calculatePositionSize: calcSize,
                    calculateTPSL:          calcTPSL
                });

            openPosition = np;
            balance      = nb;
            if (tradeRecord) trades.push(tradeRecord);
        }

        // finalize any open position
        const last = candles[candles.length-1];
        const { newBalance: closeBal, tradeRecord: finalTrade } =
            closeFinal(openPosition, last.close, last.timestamp);
        if (finalTrade) {
            trades.push(finalTrade);
            balance += closeBal;
        }

        // 3) metrics
        const metrics = calculateMetrics(trades, balance);

        // 4) conditional optimization
        let optimizedParams = null;
        if (optimize) {
            const closedTrades = trades.filter(t => t.closedBy);
            const winRatePct   = metrics.winRate * 100;
            if (closedTrades.length >= minTrades && winRatePct >= minAccuracy) {
                optimizedParams = await riskManager.optimizeParameters(
                    symbol, indicators, optimizationMethod, candles
                );
            } else {
                optimizedParams = {
                    reason: `Skipped: only ${closedTrades.length} trades and ${winRatePct.toFixed(2)}% win-rate`
                };
            }
        }

        return {
            summary: {
                initialBalance,
                finalBalance: balance,
                totalTrades:  trades.length,
                metrics
            },
            trades,
            optimizedParams
        };
    }
}

module.exports = new BacktestService();
