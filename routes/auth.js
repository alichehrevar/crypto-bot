// routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../app/http/controllers/authController');
const authenticate = require("../app/http/middleware/auth");

// POST /api/auth/login
router.post('/check-email-existence', authController.checkEmailExistence);
router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/verify-otp', authController.verifyOtp);
router.post('/logout', authenticate, authController.logout);

module.exports = router;
