// app/services/backtestService/BacktestService.js

const axios         = require('axios');
const BacktestRun   = require('../../models/BacktestRun');
const { processSignal } = require('./BacktestSignalProcessor');
const riskManager   = require('./BacktestRiskManager');
const { simulateOrder, closeFinal } = require('./BacktestOrderSimulator');
const { calculateMetrics } = require('./BacktestMetricsCalculator');

class BacktestService {
    async run(opts) {
        const {
            userId,
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
        const pair = symbol.replace('/', '').toUpperCase();
        let candles = [];

        if (mode === 'recent') {
            const resp = await axios.get('https://api.binance.com/api/v3/klines', {
                params: { symbol: pair, interval: indicators[0].timeframe, limit: recentCount }
            });
            candles = resp.data.map(k => ({
                timestamp: new Date(k[0]),
                open:   +k[1],
                high:   +k[2],
                low:    +k[3],
                close:  +k[4],
                volume: +k[5],
            }));
        } else {
            const startMs = new Date(startDate).getTime();
            const endMs   = new Date(endDate).getTime();
            let from = startMs;
            do {
                const resp = await axios.get('https://api.binance.com/api/v3/klines', {
                    params: {
                        symbol:   pair,
                        interval: indicators[0].timeframe,
                        startTime: from,
                        endTime:   endMs,
                        limit:     1000
                    }
                });
                const batch = resp.data.map(k => ({
                    timestamp: new Date(k[0]),
                    open:   +k[1],
                    high:   +k[2],
                    low:    +k[3],
                    close:  +k[4],
                    volume: +k[5],
                }));
                if (!batch.length) break;
                candles.push(...batch);
                from = batch[batch.length - 1].timestamp.getTime() + 1;
            } while (from < endMs);
        }

        if (!candles.length) {
            throw new Error('No candle data fetched for backtest');
        }

        // 2) Determine warm-up period for the first indicator
        const { indicator: firstInd, params: firstParams = {} } = indicators[0];
        let minRequired = 1;
        switch (firstInd) {
            case 'RSI': {
                const period = firstParams.period || 14;
                minRequired = period + 1;
                break;
            }
            case 'MACD': {
                const sp = firstParams.shortPeriod  || 12;
                const lp = firstParams.longPeriod   || 26;
                const sig= firstParams.signalPeriod || 9;
                minRequired = sp + lp + sig;
                break;
            }
            // you can add other indicators here if they need special warm-up
        }

        // 3) Simulation loop (skipping until warm-up)
        let balance      = initialBalance;
        let openPosition = null;
        const trades     = [];

        for (let i = 0; i < candles.length; i++) {
            const slice = candles.slice(0, i + 1);

            // Skip until we've loaded enough history
            if (slice.length < minRequired) {
                if (i === minRequired - 1) {
                    console.warn(
                        `Backtest warm-up: fetched ${slice.length} candles, need ${minRequired} for ${firstInd}`
                    );
                }
                continue;
            }

            const now   = candles[i].timestamp;
            const price = candles[i].close;

            // risk guard
            if (!riskManager.enforceRiskLimits(trades, risk, balance)) {
                console.warn('Risk limits hit—stopping backtest');
                break;
            }

            // signal
            const signal = processSignal(slice, firstInd, firstParams);
            console.log(
                `⏱ [${now.toISOString()}] ${firstInd} → ${signal}  |  last 3 close prices:`,
                slice.slice(-3).map(c=>c.close)
            );

            // sizing
            const calcSize = risk
                ? () => (risk.investment * (risk.leverage || 1)) / price
                : (bal, pr) => {
                    // ask riskManager, but if it comes back zero or invalid, default to using entire balance
                    const size = riskManager.calculatePositionSize(firstParams.riskParams || {}, bal, pr);
                    return size > 0
                        ? size
                        : Math.floor((bal / pr) * 1e8) / 1e8;  // use full balance, round to 8 decimals
                };

            // TP/SL
            const calcTPSL = risk
                ? () => ({
                    TP: price * (1 + (risk.takeProfitPct || 0) / 100),
                    SL: price * (1 - (risk.stopLossPct  || 0) / 100)
                })
                : ep => riskManager.calculateTPSL(firstParams, ep);

            const { openPosition: np, balance: nb, tradeRecord } = await simulateOrder({
                balance,
                currentPrice:          price,
                currentTime:           now,
                signal,
                openPosition,
                calculatePositionSize: calcSize,
                calculateTPSL:         calcTPSL
            });

            openPosition = np;
            balance      = nb;
            if (tradeRecord) trades.push(tradeRecord);
        }

        // 4) Close any open position
        const last = candles[candles.length - 1];
        const { newBalance: closeBal, tradeRecord: finalTrade } = closeFinal(openPosition, last.close, last.timestamp);
        if (finalTrade) {
            trades.push(finalTrade);
            balance += closeBal;
        }

        // 5) Metrics
        const metrics = calculateMetrics(trades, balance);

        // 6) Optional optimization
        let optimizedParams = null;
        if (optimize) {
            const closedTrades = trades.filter(t => t.closedBy);
            const winPct       = metrics.winRate * 100;
            if (closedTrades.length >= minTrades && winPct >= minAccuracy) {
                optimizedParams = await riskManager.optimizeParameters(
                    symbol, indicators, optimizationMethod, candles
                );
            } else {
                optimizedParams = {
                    reason: `Skipped optimize: ${closedTrades.length} trades, ${winPct.toFixed(2)}% win-rate`
                };
            }
        }

        // 7) Persist
        const record = await BacktestRun.create({
            userId,
            symbol,
            mode,
            recentCount:  mode === 'recent' ? recentCount : undefined,
            startDate:    mode === 'range'  ? new Date(startDate) : undefined,
            endDate:      mode === 'range'  ? new Date(endDate)   : undefined,
            indicators,
            optimize,
            optimizationMethod,
            minAccuracy,
            minTrades,
            useRisk:     !!risk,
            riskOptions: risk,
            initialBalance,
            finalBalance: balance,
            metrics,
            trades
        });

        // 8) Return
        return {
            runId: record._id,
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
