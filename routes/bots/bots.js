// app/routes/bots.js

const express = require('express');
const router = express.Router();
const { validateBotParams } = require('../../app/http/middleware/validation');
const botController = require('../../app/http/controllers/botController');
const authenticate = require('../../app/http/middleware/auth');

// --- ADVANCED GRID BOT ROUTES ---
router.post('/grid/create', authenticate, botController.createGridBot);
router.post('/grid/:id/stop', authenticate, botController.stopGridBot);

// Get lookup props (risk strategies, etc.)
router.get('/botProps', authenticate, botController.botProps);

// Deploy a new bot (indicator or grid)
router.post('/deploy', authenticate, botController.deployBot);

// Upsert indicator bots for a symbol/timeframe
router.get('/select', botController.selectBots);

// Retrieve all bots
router.get('/', authenticate, botController.getBots);

// Retrieve a single bot by ID
router.get('/:id', botController.getBotById);

// Update an existing bot configuration
router.put('/:id', validateBotParams, botController.updateBot);

// Pause / Resume
router.post('/:id/pause', authenticate,  botController.pauseBot);
router.post('/:id/resume', authenticate, botController.resumeBot);

// Delete a bot
router.delete('/:id', authenticate, botController.stopBot);

// Close a trade for a given bot
router.post('/:botId/trades/:tradeId/close', authenticate, botController.closeTrade);

module.exports = router;
