// app/routes/coin.js
const express = require('express');
const router  = express.Router();
const { getCoinSummary } = require('../app/http/controllers/coinController');

// e.g. GET /api/coins/btc-bitcoin/summary
router.get('/:coinId/summary', getCoinSummary);

module.exports = router;
