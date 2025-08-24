// routes/market.js
const express = require('express')
const router = express.Router()
const marketController = require('../app/http/controllers/marketController')
const authenticate = require('../app/http/middleware/auth');

router.get('/top-movers', marketController.getTopMovers)
router.get('/market-list', authenticate, marketController.getMarketList)

/**
 * @swagger
 * /api/market/ticker-details:
 *   get:
 *     summary: Get detailed information for a specific ticker.
 * @route   GET /api/market/ticker-details
 * @desc    Get detailed information for a specific ticker.
 * @access  private
 */
router.get('/ticker-details', marketController.getTickerDetails) // This route should probably take a ticker symbol as a query parameter

/**
 * @route   GET /api/market/movers
 * @desc    Get data for the Market Movers & Volatility component.
 * @access  private
 */
router.get('/movers', marketController.getMoversAndVolatility);

module.exports = router
