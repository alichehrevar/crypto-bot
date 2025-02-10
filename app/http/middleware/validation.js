// app/http/middleware/validation.js
const { body, validationResult } = require('express-validator');

// Basic validations for all bots.
const botBasicValidators = [
    body('name')
        .notEmpty()
        .withMessage('Bot name is required'),
    body('symbol')
        .matches(/^[A-Z]+\/[A-Z]+$/)
        .withMessage('Symbol must use the format: BASE/QUOTE (e.g. BTC/USDT)'),
    body('timeframe')
        .isIn(['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'])
        .withMessage('Invalid timeframe'),
    body('strategy')
        .isIn(['MA_Crossover', 'RSI', 'MACD'])
        .withMessage('Invalid strategy')
];

// Strategy-specific validators.
const strategyValidators = {
    MA_Crossover: [
        body('strategyParams.shortPeriod')
            .isInt({ min: 5, max: 100 })
            .withMessage('shortPeriod must be an integer between 5 and 100'),
        body('strategyParams.longPeriod')
            .isInt({ min: 10, max: 200 })
            .withMessage('longPeriod must be an integer between 10 and 200')
    ],
    RSI: [
        body('strategyParams.period')
            .isInt({ min: 5, max: 30 })
            .withMessage('period must be an integer between 5 and 30'),
        body('strategyParams.overbought')
            .isFloat({ min: 50, max: 90 })
            .withMessage('overbought must be a float between 50 and 90'),
        body('strategyParams.oversold')
            .isFloat({ min: 10, max: 50 })
            .withMessage('oversold must be a float between 10 and 50')
    ],
    MACD: [
        body('strategyParams.fastPeriod')
            .isInt({ min: 5, max: 100 })
            .withMessage('fastPeriod must be an integer between 5 and 100'),
        body('strategyParams.slowPeriod')
            .isInt({ min: 10, max: 200 })
            .withMessage('slowPeriod must be an integer between 10 and 200'),
        body('strategyParams.signalPeriod')
            .isInt({ min: 5, max: 100 })
            .withMessage('signalPeriod must be an integer between 5 and 100')
    ]
};

/**
 * Middleware to validate bot parameters.
 * This runs the basic validations first, then strategy-specific validations (if defined).
 */
exports.validateBotParams = async (req, res, next) => {
    // Run basic validations.
    await Promise.all(botBasicValidators.map(validation => validation.run(req)));

    // Run strategy-specific validations, if any.
    const strategy = req.body.strategy;
    const strategyValidations = strategyValidators[strategy] || [];
    await Promise.all(strategyValidations.map(validation => validation.run(req)));

    // Check for errors.
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};
