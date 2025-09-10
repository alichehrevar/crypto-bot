const express = require('express');
const router = express.Router();
const netFlowController = require('../../app/http/controllers/market/netFlowController');
const authenticate = require('../../app/http/middleware/auth');

// GET /api/market/net-flows
// This route is protected and requires authentication.
router.get('/', authenticate, netFlowController.getNetFlows);

module.exports = router;
