const { body } = require('express-validator');
const { validationResult } = require('express-validator');

const strategyValidators = {
    MA_Crossover: [
        body('strategyParams.shortPeriod').isInt({ min: 5, max: 100 }),
        body('strategyParams.longPeriod').isInt({ min: 10, max: 200 })
    ],
    RSI: [
        body('strategyParams.period').isInt({ min: 5, max: 30 }),
        body('strategyParams.overbought').isFloat({ min: 50, max: 90 }),
        body('strategyParams.oversold').isFloat({ min: 10, max: 50 })
    ]
};

exports.validateBotParams = (req, res, next) => {
    const strategy = req.body.strategy;
    const validators = strategyValidators[strategy] || [];
    Promise.all(validators.map(validation => validation.run(req)))
        .then(() => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            next();
        });
};
