// routes/user.js
const express = require('express');
const router = express.Router();
const authenticate = require('../app/http/middleware/auth'); // Authentication middleware
const userController = require('../app/http/controllers/userController');

router.get('/info',   authenticate, userController.userInfo);
router.post('/favorites/toggle', authenticate, userController.toggleFavoriteSymbol);

module.exports = router;
