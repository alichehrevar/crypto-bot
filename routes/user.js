// routes/user.js
const express = require('express');
const router = express.Router();
const authenticate = require('../app/http/middleware/auth'); // Authentication middleware
const userController = require('../app/http/controllers/userController');

/**
 * @route   GET /api/user/info
 * @desc    Get the authenticated user's information
 * @access  Private
 */
router.get('/info', authenticate, userController.userInfo);

/**
 * @route   PUT /api/user/info/update
 * @desc    Update the authenticated user's information
 * @access  Private
 */
router.put('/info/update', authenticate, userController.updateUserInfo);

/**
 * @route   POST /api/user/favorites/toggle
 * @desc    Toggle a symbol as favorite for the authenticated user
 * @access  Private
 */
router.post('/favorites/toggle', authenticate, userController.toggleFavoriteSymbol);

module.exports = router;
