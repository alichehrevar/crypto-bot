// app/http/controllers/backtestController.js

const BacktestService  = require('../../services/backtestService/BacktestService');
const BacktestResult   = require('../../models/BacktestResult');
const User             = require('../../models/User');

exports.run = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(401).json({ error: 'User not found' });

        // parse payload
        const payload = {
            ...req.body,
            indicators: JSON.parse(req.body.indicators),
            risk:       req.body.risk ? JSON.parse(req.body.risk) : undefined
        };

        const result = await BacktestService.run(payload);

        // persist
        const doc = await BacktestResult.create({
            userId:        user._id,
            symbol:        payload.symbol,
            mode:          payload.mode,
            recentCount:   payload.recentCount,
            startDate:     payload.startDate,
            endDate:       payload.endDate,
            indicators:    payload.indicators,
            optimize:      payload.optimize,
            optimizationMethod: payload.optimizationMethod,
            minAccuracy:   payload.minAccuracy,
            minTrades:     payload.minTrades,
            risk:          payload.risk,
            initialBalance: payload.initialBalance,
            finalBalance:  result.summary.finalBalance,
            metrics:       result.summary.metrics,
            trades:        result.trades
        });

        return res.json({ success: true, backtestId: doc._id, result });
    } catch (err) {
        console.error('BacktestController.run error', err);
        return res.status(400).json({ success: false, error: err.message });
    }
};
