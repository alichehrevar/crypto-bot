// strategies/optimization/sharedSimulation.js

const { processSignal }      = require('../../services/backtestService/BacktestSignalProcessor');
const riskManager            = require('../../services/backtestService/BacktestRiskManager');
const { simulateOrder, closeFinal } = require('../../services/backtestService/BacktestOrderSimulator');
const { calculateMetrics }   = require('../../services/backtestService/BacktestMetricsCalculator');

/**
 * simulateWholeStrategy
 *
 * Runs a backtest simulation over historicalCandles using given indicator and params.
 * Returns an object with totalPnL, totalTrades, and winRate.
 */
function simulateWholeStrategy(indicatorName, params, candles) {
    const initialBalance = 10000;
    let balance    = initialBalance;
    let openPos    = null;
    const trades   = [];

    // determine warm-up
    let warmUp = 1;
    if (indicatorName === 'RSI') {
        warmUp = (params.period || 14) + 1;
    } else if (indicatorName === 'MACD') {
        warmUp = (params.shortPeriod || 12)
            + (params.longPeriod  || 26)
            + (params.signalPeriod|| 9);
    }

    // main loop
    for (let i = warmUp; i < candles.length; i++) {
        const slice      = candles.slice(0, i + 1);
        const entryPrice = candles[i - 1].close;
        const exitPrice  = candles[i].close;
        const now        = candles[i].timestamp;

        // risk-limit check
        if (!riskManager.enforceRiskLimits(trades, params.riskParams || {}, balance)) {
            break;
        }

        // get buy/sell/hold
        const signal = processSignal(slice, indicatorName, params);

        // position sizing & TP/SL
        const calculatePositionSize = (bal, pr) =>
            riskManager.calculatePositionSize(params.riskParams || {}, bal, pr);
        const calculateTPSL = price =>
            riskManager.calculateTPSL(params, price);

        // simulate this candle’s order
        const { openPosition: nextPos, balance: nextBal, tradeRecord } =
            simulateOrder({
                balance,
                currentPrice:  exitPrice,
                currentTime:   now,
                signal,
                openPosition:  openPos,
                calculatePositionSize,
                calculateTPSL
            });

        openPos = nextPos;
        balance = nextBal;
        if (tradeRecord) trades.push(tradeRecord);
    }

    // close any open position at the end
    const last = candles[candles.length - 1];
    const final = closeFinal(openPos, last.close, last.timestamp);
    if (final.tradeRecord) {
        balance += final.newBalance;
        trades.push(final.tradeRecord);
    }

    // compute your metrics
    const metrics = calculateMetrics(trades, balance);

    // === F I X  ===
    const wins = trades.filter(t => t.profit > 0).length;
    console.log(
        `>> simulateWholeStrategy: trades=${trades.length}, wins=${wins}, PnL=${metrics.totalPnL}`
    );

    return {
        totalPnL:    metrics.totalPnL,
        totalTrades: trades.length,
        winRate:     metrics.winRate
    };
}

module.exports = { simulateWholeStrategy };
