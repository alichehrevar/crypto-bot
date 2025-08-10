// File: app/services/backtestService/BacktestOrderSimulator.js
/**
 * @file A stateful class that simulates trade execution and manages portfolio state.
 */
const { calculatePositionSize, calculateTPSL } = require('./riskUtils');

class BacktestOrderSimulator {
    constructor({ initialBalance, riskParams = {}, equityCurve }) {
        this.balance = initialBalance;
        this.riskParams = riskParams;
        this.equityCurve = equityCurve;
        this.openPosition = null;
        this.trades = [];
    }

    step(candle, signal) {
        const { high, low, close, time } = candle;
        this._checkAutoExit(high, low, time);
        this._checkSignalExit(signal, close, time);
        this._maybeEnter(signal, close, time);
        this._snapshotEquity({ high, low, close });
    }

    closeFinal(price, time) {
        if (this.openPosition) this._close(price, time, 'EOD');
    }

    _checkAutoExit(high, low, time) {
        if (!this.openPosition) return;
        const { direction, TP, SL } = this.openPosition;
        let trigger = null;
        if (direction === 'LONG') {
            if (low <= SL) trigger = { price: SL, reason: 'SL' };
            else if (high >= TP) trigger = { price: TP, reason: 'TP' };
        } else { // SHORT
            if (high >= SL) trigger = { price: SL, reason: 'SL' };
            else if (low <= TP) trigger = { price: TP, reason: 'TP' };
        }
        if (trigger) this._close(trigger.price, time, trigger.reason);
    }

    _checkSignalExit(signal, price, time) {
        if (!this.openPosition) return;
        const { direction } = this.openPosition;
        const exitLong = direction === 'LONG' && signal === 'SELL';
        const exitShort = direction === 'SHORT' && signal === 'BUY';
        if (exitLong || exitShort) this._close(price, time, 'SignalExit');
    }

    _maybeEnter(signal, price, time) {
        if (this.openPosition) return;
        if (signal !== 'BUY' && signal !== 'SELL') return;
        const direction = signal === 'BUY' ? 'LONG' : 'SHORT';
        const { TP, SL } = calculateTPSL(this.riskParams, price, direction);
        let qty = calculatePositionSize(this.riskParams, this.balance, price, SL);
        if (qty <= 0) return;
        const leverage = this.riskParams.leverage || 1;
        const margin = (qty * price) / leverage;
        if (margin > this.balance) {
            qty = (this.balance * leverage) / price;
            if (qty <= 0) return;
        }
        this._open({ qty, entry: price, TP, SL, direction, entryTime: time });
    }

    _open({ qty, entry, TP, SL, direction, entryTime }) {
        const leverage = this.riskParams.leverage || 1;
        const margin = (qty * entry) / leverage;
        if (margin > this.balance) return;
        this.balance -= margin;
        this.openPosition = { qty, entry, TP, SL, direction, entryTime };
    }

    _close(exitPrice, exitTime, reason) {
        const { qty, entry, direction, entryTime } = this.openPosition;
        const leverage = this.riskParams.leverage || 1;
        const profit = direction === 'LONG' ? qty * (exitPrice - entry) : qty * (entry - exitPrice);
        const margin = (qty * entry) / leverage;
        this.balance += margin + profit;
        this.trades.push({
            entry, exit: exitPrice, qty, profit, direction, entryTime, exitTime, duration: exitTime - entryTime, closedBy: reason
        });
        this.openPosition = null;
    }

    _snapshotEquity({ high, low, close }) {
        const unrealisedPnL = (price) => {
            if (!this.openPosition) return 0;
            const { qty, entry, direction } = this.openPosition;
            return direction === 'LONG' ? qty * (price - entry) : qty * (entry - price);
        };
        if (this.openPosition) {
            const { direction } = this.openPosition;
            const highEq = this.balance + unrealisedPnL(direction === 'LONG' ? high : low);
            const lowEq = this.balance + unrealisedPnL(direction === 'LONG' ? low : high);
            if (direction === 'LONG') this.equityCurve.push(highEq, lowEq);
            else this.equityCurve.push(lowEq, highEq);
        }
        this.equityCurve.push(this.balance + unrealisedPnL(close));
    }
}

module.exports = BacktestOrderSimulator;
