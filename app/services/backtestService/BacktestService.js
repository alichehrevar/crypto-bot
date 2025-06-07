// app/services/backtestService/BacktestService.js

const axios = require('axios');
const { processSignal } = require('./BacktestSignalProcessor');
const riskManager       = require('./BacktestRiskManager');
const { simulateOrder, closeFinal } = require('./BacktestOrderSimulator');
const { calculateMetrics } = require('./BacktestMetricsCalculator');

class BacktestService {
    /**
     * Runs a live‐data backtest by fetching candles from Binance,
     * simulating orders, optionally optimizing, and returning + persisting results.
     *
     * @param {Object} opts
     * @param {String} opts.symbol               e.g. "BTC/USDT"
     * @param {'recent'|'range'} opts.mode       "recent" or "range"
     * @param {Number}  [opts.recentCount]       number of most recent candles
     * @param {String}  [opts.startDate]         ISO date for range start
     * @param {String}  [opts.endDate]           ISO date for range end
     * @param {Array<{indicator:String, timeframe:String, params:Object}>} opts.indicators
     * @param {Boolean} opts.optimize            whether to run optimization
     * @param {String}  opts.optimizationMethod  "grid"|"bayesian"|"ann"
     * @param {Number}  opts.minAccuracy
     * @param {Number}  opts.minTrades
     * @param {Object}  [opts.risk]              { investment, leverage, takeProfitPct, stopLossPct }
     * @param {Number}  [opts.initialBalance=10000]
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
            minAccuracy,
            minTrades,
            risk = {},
            initialBalance = 10000
        } = opts;

        // 1) Prepare candle fetch
        const apiSymbol = symbol.replace('/', '').toUpperCase();
        const interval  = indicators[0].timeframe; // assume first timeframe
        let candles = [];

        if (mode === 'recent') {
            const resp = await axios.get('https://api.binance.com/api/v3/klines', {
                params: { symbol: apiSymbol, interval, limit: recentCount }
            });
            candles = resp.data.map(k => ({
                timestamp: new Date(k[0]),
                open:   +k[1],
                high:   +k[2],
                low:    +k[3],
                close:  +k[4],
                volume: +k[5]
            }));
        } else {
            // range mode: page through (max 1000 per request)
            const startMs = new Date(startDate).getTime();
            const endMs   = new Date(endDate).getTime();
            let cursor = startMs;
            while (cursor < endMs) {
                const resp = await axios.get('https://api.binance.com/api/v3/klines', {
                    params: {
                        symbol: apiSymbol,
                        interval,
                        startTime: cursor,
                        endTime:   endMs,
                        limit: 1000
                    }
                });
                const batch = resp.data.map(k => ({
                    timestamp: new Date(k[0]),
                    open:   +k[1],
                    high:   +k[2],
                    low:    +k[3],
                    close:  +k[4],
                    volume: +k[5]
                }));
                if (!batch.length) break;
                candles.push(...batch);
                cursor = batch[batch.length - 1].timestamp.getTime() + 1;
            }
        }

        if (!candles.length) {
            throw new Error('No candle data fetched for backtest');
        }

        // 2) Simulate
        let balance      = initialBalance;
        let openPosition = null;
        const trades     = [];

        for (let i = 0; i < candles.length; i++) {
            const slice       = candles.slice(0, i + 1);
            const current     = candles[i];
            const { timestamp, close: price } = current;

            // enforce risk stops
            if (!riskManager.enforceRiskLimits(trades, risk, balance)) {
                break;
            }

            // get a signal from each indicator, then consensus (simple: first only)
            const { indicator: indName, params: indParams } = indicators[0];
            const signal = processSignal(slice, indName, indParams);

            // prepare sizing & TP/SL
            const calcSize = risk.investment
                ? () => (risk.investment * (risk.leverage || 1)) / price
                : (bal, p) => riskManager.calculatePositionSize(risk, bal, p);

            const calcTPSL = risk.takeProfitPct != null
                ? () => ({
                    TP: price * (1 + risk.takeProfitPct / 100),
                    SL: price * (1 - risk.stopLossPct   / 100)
                })
                : entry => riskManager.calculateTPSL(indParams, entry);

            // simulate order
            const { openPosition: np, balance: nb, tradeRecord } = await simulateOrder({
                balance,
                currentPrice: price,
                currentTime: timestamp,
                signal,
                openPosition,
                calculatePositionSize: calcSize,
                calculateTPSL: calcTPSL
            });

            openPosition = np;
            balance      = nb;
            if (tradeRecord) trades.push(tradeRecord);
        }

        // 3) Final mark‐to‐market close
        const lastCandle = candles[candles.length - 1];
        const { tradeRecord: finalRecord } = closeFinal(openPosition, lastCandle.close, lastCandle.timestamp);
        if (finalRecord) trades.push(finalRecord);

        // 4) Optional optimization
        let optimizedParams = null;
        if (optimize) {
            optimizedParams = await riskManager.optimizeParameters(
                symbol, indicators, optimizationMethod, candles
            );
        }

        // 5) Compute metrics
        const metrics = calculateMetrics(trades, balance);

        // 6) Return full result
        return {
            input: opts,
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
