// routes/pnl.js
const express = require('express');
const router = express.Router();
const authenticate = require('../app/http/middleware/auth'); // Authentication middleware
const pnlController = require('../app/http/controllers/pnlController');

router.get('/realized',   authenticate, pnlController.getRealizedPnL);
router.get('/unrealized', authenticate, pnlController.getUnrealizedPnL);
router.get('/all', authenticate, pnlController.getAllPnL);

module.exports = router;
