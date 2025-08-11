// routes/user.js
const express = require('express');
const router = express.Router();
const authenticate = require('../app/http/middleware/auth'); // Authentication middleware
const userController = require('../app/http/controllers/userController');

router.get('/info',   authenticate, userController.userInfo);

module.exports = router;
