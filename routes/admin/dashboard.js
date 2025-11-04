// routes/dashboard.js
const express = require('express');
const router = express.Router();
const dashboardController = require('../../app/http/controllers/admin/dashboardController');
const authenticate = require('../../app/http/middleware/auth');

/**
 * GET /api/admin/dashboard
 *
 * Retrieves a list of bots.
 *
 */
router.get('/', authenticate, dashboardController.dashboardOverview);

module.exports = router;
