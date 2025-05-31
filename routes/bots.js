const express = require('express');
const router = express.Router();
const { validateBotParams } = require('../app/http/middleware/validation');
const botController = require('../app/http/controllers/botController');
const gridBotController = require('../app/http/controllers/gridBotController');
const authenticate = require('../app/http/middleware/auth'); // Authentication middleware

router.get('/botProps', authenticate, botController.botProps);

// Deploy a new bot.
router.post('/deploy', authenticate, botController.deployBot);

// Select bots (upsert indicator bots for a given symbol/timeframe).
router.get('/select', botController.selectBots);

// Retrieve all bots.
router.get('/', authenticate, botController.getBots);

// Retrieve a single bot by ID.
router.get('/:id', botController.getBotById);

// Update an existing bot configuration.
router.put('/:id', validateBotParams, botController.updateBot);

// Pause / Resume
router.post('/:id/pause', authenticate,  botController.pauseBot);
router.post('/:id/resume', authenticate, botController.resumeBot);

// Delete a bot configuration.
router.delete('/:id', authenticate, botController.deleteBot);

router.post('/:botId/trades/:tradeId/close', authenticate, botController.closeTrade);

// Grid endpoints:
router.post('/:botId/grid/start', authenticate, gridBotController.startGrid);
router.post('/:botId/grid/stop',  authenticate, gridBotController.stopGrid);
router.get('/:botId/grid/status', authenticate, gridBotController.getGridStatus);

module.exports = router;
