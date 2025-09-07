// File: routes/sentiment.js

const express = require('express');
const router = express.Router();
const authenticate = require('../../app/http/middleware/auth'); // Authentication middleware
const sentimentController = require('../../app/http/controllers/market/sentimentController.js');


// Define the route: GET /
// When a request hits this, it will be handled by the getSentiment method.
router.get('/', authenticate, sentimentController.getSentiment);

module.exports = router;
