// routes/market/sectors.js

const express = require('express');
const router = express.Router();
const authenticate = require('../../app/http/middleware/auth');
const sectorController = require('../../app/http/controllers/market/sectorController');

// GET /api/market/sectors/performance
// Fetches the 24-hour performance ranking for all defined sectors
router.get('/performance', authenticate, sectorController.getPerformance);
router.get('/rotation', authenticate, sectorController.getRotationData);

module.exports = router;
