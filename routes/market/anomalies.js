const express = require('express');
const router = express.Router();
const authenticate = require('../../app/http/middleware/auth'); // Authentication middleware
const anomalyController = require('../../app/http/controllers/market/anomalyController');

// GET /api/anomalies
// Retrieves the latest market anomalies.
router.get('/', authenticate, anomalyController.getAnomalies);

module.exports = router;
