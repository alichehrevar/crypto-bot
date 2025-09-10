const express = require('express');
const router = express.Router();
const listingController = require('../app/http/controllers/listingController');
const authenticate = require("../app/http/middleware/auth");

// GET /api/listings - Get all upcoming and recent listings
// You can protect it with auth middleware if needed
router.get('/', authenticate, listingController.getListings);

module.exports = router;
