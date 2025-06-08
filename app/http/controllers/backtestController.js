// app/http/controllers/backtestController.js

const BacktestService  = require('../../services/backtestService/BacktestService');
const BacktestRun = require('../../models/BacktestRun');
const User             = require('../../models/User');

exports.run = async (req, res) => {
    try {
        // 1) Authenticate
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(401).json({ success: false, error: 'User not found.' });
        }

        // 2) Parse JSON-encoded fields from the form
        const {
            symbol,
            mode,
            recentCount,
            startDate,
            endDate,
            initialBalance,
            optimize,
            optimizationMethod,
            minAccuracy,
            minTrades,
        } = req.body;

        let indicators;
        try {
            indicators = JSON.parse(req.body.indicators);
        } catch {
            return res.status(400).json({ success: false, error: 'Invalid indicators payload.' });
        }

        let risk;
        if (req.body.risk) {
            try {
                risk = JSON.parse(req.body.risk);
            } catch {
                return res.status(400).json({ success: false, error: 'Invalid risk payload.' });
            }
        }

        // 3) Call the service, passing userId along
        const result = await BacktestService.run({
            userId:             user._id,
            symbol,
            mode,
            recentCount:        mode === 'recent' ? Number(recentCount) : undefined,
            startDate:          mode === 'range'  ? new Date(startDate) : undefined,
            endDate:            mode === 'range'  ? new Date(endDate)   : undefined,
            indicators,
            initialBalance:     initialBalance != null ? Number(initialBalance) : 10000,
            optimize:           optimize === 'true' || optimize === true,
            optimizationMethod: optimizationMethod || undefined,
            minAccuracy:        minAccuracy != null ? Number(minAccuracy) : undefined,
            minTrades:          minTrades   != null ? Number(minTrades)   : undefined,
            risk,
        });

        // 4) Return success + the persisted runId + service result
        return res.json({
            success:   true,
            backtestId: result.runId,
            result
        });
    } catch (err) {
        console.error('backtestController.run error', err);
        return res
            .status(500)
            .json({ success: false, error: err.message || 'Backtest failed.' });
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
