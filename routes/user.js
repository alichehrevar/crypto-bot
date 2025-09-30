// routes/user.js
const express = require('express');
const router = express.Router();
const { updateUserSecurityInfoRules, validate } = require('../app/http/validators/updateUserSecurityInfoRequest');
const authenticate = require('../app/http/middleware/auth'); // Authentication middleware
const uploadAvatar = require('../app/http/middleware/upload'); // Avatar upload middleware
const userController = require('../app/http/controllers/userController');

/**
 * @route   GET /api/user/info
 * @desc    Get the authenticated user's information
 * @access  Private
 */
router.get('/info', authenticate, userController.userInfo);

/**
 * @route   POST /api/user/avatar/update
 * @desc    Update the authenticated user's avatar
 * @access  Private
 */
router.post('/avatar/update', authenticate, uploadAvatar, userController.updateUserAvatar);

/**
 * @route   PUT /api/user/info/update
 * @desc    Update the authenticated user's information
 * @access  Private
 */
router.put('/info/update', authenticate, userController.updateUserInfo);

/**
 * @route   PUT /api/user/info/security/update
 * @desc    Update the authenticated user's security information (e.g., password)
 * @access  Private
 */
router.put('/info/security/update',
    authenticate,
    updateUserSecurityInfoRules(),
    validate,
    userController.updateUserSecurityInfo
);

/**
 * @route   POST /api/user/favorites/toggle
 * @desc    Toggle a symbol as favorite for the authenticated user
 * @access  Private
 */
router.post('/favorites/toggle', authenticate, userController.toggleFavoriteSymbol);

router.post('/2fa/toggle', authenticate, userController.toggle2FA);

module.exports = router;
