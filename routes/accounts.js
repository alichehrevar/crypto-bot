// routes/accounts.js
const express = require('express');
const router = express.Router();
const accountController = require('../app/http/controllers/accountController');
const authenticate = require('../app/http/middleware/auth'); // Ensure you have authentication middleware

// Protect these routes with auth middleware.
router.get('/binance', authenticate, accountController.getBinanceAccount);
router.post('/binance', authenticate, accountController.linkBinanceAccount);

router.get('/okx', authenticate, accountController.getOkxAccount);
router.post('/okx', authenticate, accountController.linkOkxAccount);

router.get('/bingx', authenticate, accountController.getBingxAccount);
router.post('/bingx', authenticate, accountController.addBingxAccount);

router.get('/:accountId/balance', authenticate, accountController.getAccountBalance);

module.exports = router;
