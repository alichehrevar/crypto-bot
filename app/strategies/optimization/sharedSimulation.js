// app/strategies/optimization/sharedSimulation.js

const { processSignal } = require('../../services/backtestService/BacktestSignalProcessor');
const { simulateOrder, closeFinal } = require('../../services/backtestService/BacktestOrderSimulator');
const { calculateMetrics } = require('../../services/backtestService/BacktestMetricsCalculator');
const riskUtils = require('../../services/backtestService/riskUtils');

function simulateWholeStrategy(indicatorName, params, candles, options = {}) {
    const { initialBalance = 10000, risk = {} } = options;
    let balance = initialBalance;
    let openPos = null;
    const trades = [];

    let warmUp = 1;
    if (indicatorName === 'RSI') {
        warmUp = (params.period || 14) + 1;
    } else if (indicatorName === 'MACD') {
        warmUp = (params.shortPeriod || 12) + (params.longPeriod || 26) + (params.signalPeriod || 9);
    }
    if (candles.length <= warmUp) {
        return { totalPnL: 0, totalTrades: 0, winRate: 0, avgTradeDuration: 0 };
    }

    for (let i = warmUp; i < candles.length; i++) {
        const slice = candles.slice(0, i + 1);
        const now = candles[i].timestamp;
        const price = candles[i].close;

        if (!riskUtils.enforceRiskLimits(trades, risk, balance)) {
            break;
        }

        const signal = processSignal(slice, indicatorName, params);

        const calculatePositionSize = () => riskUtils.calculatePositionSize(risk, balance, price);
        const calculateTPSL = entryPrice => riskUtils.calculateTPSL({ ...params, ...risk }, entryPrice);

        const { openPosition: nextPos, balance: nextBal, tradeRecord } =
            simulateOrder({
                balance,
                currentPrice: price,
                currentTime: now,
                signal,
                openPosition: openPos,
                calculatePositionSize,
                calculateTPSL
            });

        openPos = nextPos;
        balance = nextBal;
        if (tradeRecord) trades.push(tradeRecord);
    }

    const lastCandle = candles[candles.length - 1];
    const { newBalance: pnlFromClose = 0, tradeRecord: finalTrade } =
        closeFinal(openPos, lastCandle.close, lastCandle.timestamp);

    if (finalTrade) {
        balance += pnlFromClose;
        trades.push(finalTrade);
    }

    return calculateMetrics(trades, balance);
}

module.exports = { simulateWholeStrategy };
