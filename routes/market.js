// routes/market.js
const express = require('express')
const router = express.Router()
const marketController = require('../app/http/controllers/marketController')
const authenticate = require('../app/http/middleware/auth');

router.get('/top-movers', marketController.getTopMovers)
router.get('/market-list', authenticate, marketController.getMarketList)
router.get('/ticker-details', marketController.getTickerDetails)

module.exports = router
