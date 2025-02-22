const express = require('express');
const router = express.Router();
const { validateBotParams } = require('../app/http/middleware/validation');
const botController = require('../app/http/controllers/botController');

// Deploy a new bot.
router.post('/deploy', botController.deployBot);

// Select bots (upsert indicator bots for a given symbol/timeframe).
router.get('/select', botController.selectBots);

// Retrieve all bots.
router.get('/', botController.getBots);

// Retrieve a single bot by ID.
router.get('/:id', botController.getBotById);

// Create a new bot configuration.
router.post('/', validateBotParams, botController.createBot);

// Update an existing bot configuration.
router.put('/:id', validateBotParams, botController.updateBot);

// Delete a bot configuration.
router.delete('/:id', botController.deleteBot);

module.exports = router;
