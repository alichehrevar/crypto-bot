// routes/accounts.js
const express = require('express');
const router = express.Router();
const accountController = require('../app/http/controllers/accountController');
const bingxController = require('../app/http/controllers/bingxAccountController');
const authenticate = require('../app/http/middleware/auth'); // Ensure you have authentication middleware

// Protect these routes with auth middleware.
router.post('/binance', authenticate, accountController.linkBinanceAccount);
router.post('/okx', authenticate, accountController.linkOkxAccount);
router.post('/bingx', authenticate, bingxController.addBingxAccount);

module.exports = router;
