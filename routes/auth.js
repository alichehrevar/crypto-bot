// routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../app/http/controllers/authController');

// POST /api/auth/login
router.post('/check-email-existence', authController.checkEmailExistence);
router.post('/login', authController.login);
router.post('/register', authController.register);

module.exports = router;
