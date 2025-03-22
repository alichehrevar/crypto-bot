// routes/accounts.js
const express = require('express');
const router = express.Router();
const accountController = require('../app/http/controllers/accountController');
const authenticate = require('../app/http/middleware/auth'); // Ensure you have authentication middleware

// Protect these routes with auth middleware.
router.post('/binance', authenticate, accountController.linkBinanceAccount);
router.post('/okx', authenticate, accountController.linkOkxAccount);
router.post('/bingx', authenticate, accountController.addBingxAccount);

router.get('/:accountId/balance', authenticate, accountController.getAccountBalance);

module.exports = router;
