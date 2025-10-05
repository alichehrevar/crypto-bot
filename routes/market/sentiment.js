// File: routes/sentiment.js

const express = require('express');
const router = express.Router();
const authenticate = require('../../app/http/middleware/auth'); // Authentication middleware
const sentimentController = require('../../app/http/controllers/market/sentimentController.js');


// Define the route: GET /
// When a request hits this, it will be handled by the getSentiment method.
router.get('/', authenticate, sentimentController.getSentiment);
router.get('/events', authenticate, sentimentController.getEvents);

// GET /api/market/sentiment/trending-topics
// Fetches the social trending topics for the dashboard widget.
router.get('/trending-topics', authenticate, sentimentController.getTrendingTopics);

module.exports = router;
