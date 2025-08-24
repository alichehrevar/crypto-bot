// app/http/validators/userValidation.js
const { body, validationResult } = require('express-validator');

/**
 * Middleware to handle validation results.
 * If there are errors, it sends a 400 response. Otherwise, it proceeds.
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
};

/**
 * Validation rules for updating user security info.
 */
const updateUserSecurityInfoRules = () => {
    return [
        // Rule: Current password is required to make any changes.
        body('password')
            .notEmpty().withMessage('Current password is required.'),

        // Rule: If newPassword is provided, it must be valid.
        body('newPassword')
            .optional({ checkFalsy: true }) // Makes this field optional, but validates if present
            .isLength({ min: 8 }).withMessage('New password must be at least 8 characters long.'),

        // Rule: If confirmPassword is provided, it must match newPassword.
        body('confirmPassword')
            .if(body('newPassword').exists({ checkFalsy: true })) // Only run this validation if newPassword exists
            .custom((value, { req }) => {
                if (value !== req.body.newPassword) {
                    throw new Error('New password and confirmation do not match.');
                }
                return true;
            }),

        // Rule: Validate phone number if provided.
        body('phoneNumber')
            .optional({ checkFalsy: true })
            .isMobilePhone('any', { strictMode: false }).withMessage('Please provide a valid phone number.'),

        // Rule: phoneCountry is required if phoneNumber is provided.
        body('phoneCountry')
            .if(body('phoneNumber').exists({ checkFalsy: true }))
            .notEmpty().withMessage('Phone country is required when providing a phone number.'),
    ];
};

module.exports = {
    updateUserSecurityInfoRules,
    validate,
};
