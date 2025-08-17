// app/routes/coin.js
const express = require('express');
const router  = express.Router();
const { getCoinSummary } = require('../app/http/controllers/coinController');
const authenticate = require("../app/http/middleware/auth");

// e.g. GET /api/coins/btc-bitcoin/summary
router.get('/:coinId/summary', authenticate, getCoinSummary);

module.exports = router;
