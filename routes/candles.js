const express = require('express');
const router = express.Router();
const candleController = require('../app/http/controllers/candleController');
const authenticate = require('../app/http/middleware/auth');

// Historical data endpoints
router.post('/historical', candleController.fetchHistoricalData);
router.get('/proxy', authenticate, candleController.proxyKlines);
router.get('/:symbol([^/]+/[^/]+)/:timeframe', candleController.getData);


// Add real-time endpoints later

module.exports = router;
