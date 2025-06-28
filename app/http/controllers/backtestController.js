// app/http/controllers/backtestController.js

const BacktestService  = require('../../services/backtestService/BacktestService');
const BacktestRun = require('../../models/BacktestRun');
const paramBounds = require('../../../config/indicatorParamBounds');
const User             = require('../../models/User');

exports.run = async (req, res) => {
    console.log('Running Backtest Service...');
    console.log(req.body.indicators)
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

        console.log(typeof req.body.indicators)
        let indicators;
        try {
            // 1. Determine the source of the indicators payload
            let indicatorsPayload = req.body.indicators;

            // 2. If the payload is a string, parse it.
            if (typeof indicatorsPayload === 'string') {
                indicatorsPayload = JSON.parse(indicatorsPayload);
            }

            // 3. Ensure the result is an array before mapping. This is a crucial validation step.
            if (!Array.isArray(indicatorsPayload)) {
                // Throw a specific error to be caught by the catch block.
                return res.status(400).json({ success: false, error: 'Indicators payload must be an array.' });
            }

            // 4. Now, map over the correctly parsed/referenced array.
            indicators = indicatorsPayload.map(ind => ({
                ...ind,
                // attach search space for this indicator, if defined
                paramSpace: paramBounds[ind.indicator] || {}
            }));

        } catch (error) {
            // The catch block will now handle errors from JSON.parse() OR the Array.isArray check.
            // You can optionally log the 'error' variable for debugging.
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
