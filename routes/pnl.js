// routes/pnl.js
const express = require('express');
const router = express.Router();
const authenticate = require('../app/http/middleware/auth'); // Authentication middleware
const pnl = require('../app/http/controllers/pnlController');

router.get('/realized',   authenticate, pnl.getRealizedPnL);
router.get('/unrealized', authenticate, pnl.getUnrealizedPnL);

module.exports = router;
