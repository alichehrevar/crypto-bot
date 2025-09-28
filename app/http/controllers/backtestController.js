// app/http/controllers/backtestController.js

const BacktestService  = require('../../services/backtestService/BacktestService');
const { getDefaultRisk } = require('../../services/backtestService/riskUtils');
const BacktestRun = require('../../models/BacktestRun');
const paramBounds = require('../../../config/indicatorParamBounds');
const User             = require('../../models/User');
const axios = require('axios');

/**
 * @description Handles the initiation of a backtest run. It validates parameters,
 * translates the incoming symbol, instantiates the service, provides a candle
 * provider, and executes the backtest.
 * @param {object} req - Express request object containing backtest parameters in the body.
 * @param {object} res - Express response object.
 */
exports.run = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(401).json({ success: false, error: 'User not found.' });
        }

        const {
            symbol, mode, recentCount, startDate, endDate, initialBalance,
            optimize, optimizationMethod, minAccuracy, minTrades,
        } = req.body;

        let strategies;
        try {
            let payload = req.body.indicators;
            if (typeof payload === 'string') payload = JSON.parse(payload);
            if (!Array.isArray(payload)) return res.status(400).json({ success: false, error: 'Indicators payload must be an array.' });
            strategies = payload.map(ind => ({ ...ind, paramSpace: paramBounds[ind.indicator] || {} }));
        } catch (error) {
            return res.status(400).json({ success: false, error: 'Invalid indicators payload.' });
        }

        let risk = getDefaultRisk(); // defaults if frontend sends nothing

        if (typeof req.body.risk !== 'undefined') {
            try {
                // accept both JSON string and plain object
                const incoming = typeof req.body.risk === 'string'
                    ? JSON.parse(req.body.risk)
                    : req.body.risk;

                if (incoming && typeof incoming === 'object') {
                    risk = { ...risk, ...incoming };
                } else {
                    return res.status(400).json({ success: false, error: 'Invalid risk payload.' });
                }
            } catch {
                return res.status(400).json({ success: false, error: 'Invalid risk payload.' });
            }
        }

        if (!symbol || typeof symbol !== 'string') {
            return res.status(400).json({ success: false, error: 'A valid symbol is required.' });
        }
        // const baseAsset = symbol.split('-')[0].toUpperCase();
        // const binanceSymbol = `${baseAsset}USDT`;
        const binanceSymbol = symbol.toUpperCase().replaceAll('/', ''); // "BTCUSDT"

        const candleProvider = async (symbol, timeframe, from, to) => {
            const url = 'https://api.binance.com/api/v3/klines';
            let allCandles = [];
            if (mode === 'recent') {
                const { data } = await axios.get(url, { params: { symbol: binanceSymbol, interval: timeframe, limit: Number(recentCount) || 1000 } });
                allCandles = data.map(k => ({ time: k[0], open: parseFloat(k[1]), high: parseFloat(k[2]), low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5]) }));
            } else {
                let startTime = from;
                while (startTime < to) {
                    const { data } = await axios.get(url, { params: { symbol: binanceSymbol, interval: timeframe, startTime, endTime: to, limit: 1000 } });
                    if (!data || data.length === 0) break;
                    const batch = data.map(k => ({ time: k[0], open: parseFloat(k[1]), high: parseFloat(k[2]), low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5]) }));
                    allCandles.push(...batch);
                    startTime = batch[batch.length - 1].time + 1;
                }
            }
            return allCandles;
        };

        const backtestServiceInstance = new BacktestService({ candleProvider });

        const result = await backtestServiceInstance.run({
            userId: user._id,
            symbol: binanceSymbol,
            strategies: strategies.map(ind => ({ ...ind, riskParams: risk })),
            initialBalance: Number(initialBalance) || 10000,
            from: mode === 'range' ? new Date(startDate).getTime() : undefined,
            to: mode === 'range' ? new Date(endDate).getTime() : undefined,
            mode, recentCount, optimize: optimize === 'true' || optimize === true,
            optimizationMethod, minAccuracy: minAccuracy != null ? Number(minAccuracy) : undefined,
            minTrades: minTrades != null ? Number(minTrades) : undefined,
            risk,
        });

        return res.json({ success: true, result });
    } catch (err) {
        console.error('backtestController.run error', err);
        return res.status(500).json({ success: false, error: err.message || 'Backtest failed.' });
    }
};

exports.listRuns = async (req, res) => {
    try {
        const runs = await BacktestRun
            .find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .select('symbol mode finalBalance metrics.winRate metrics.totalPnL createdAt')
            .lean();
        return res.json({ success: true, runs });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: err.message });
    }
};

exports.getRunById = async (req, res) => {
    try {
        const run = await BacktestRun.findById(req.params.id).lean();
        if (!run) return res.status(404).json({ success: false, error: 'Not found' });
        return res.json({ success: true, run });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: err.message });
    }
};
