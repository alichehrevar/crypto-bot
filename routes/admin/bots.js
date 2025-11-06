// routes/logs.js
const express = require('express');
const router = express.Router();
const botController = require('../../app/http/controllers/botController');
const logController = require('../../app/http/controllers/admin/logController');
const authenticate = require('../../app/http/middleware/auth');

/**
 * GET /api/bots
 *
 * Retrieves a list of bots.
 *
 */
router.get('/', authenticate, botController.botsList);

/**
 * GET /api/bots/:userId
 * Retrieves a list of user's bots
 */
router.get('/:userId', authenticate, botController.userBotsList);

/**
 * GET /api/bots/:botId/logs
 * Retrieves selected bot logs
 */
router.get('/:botId/logs', authenticate, logController.getBotLogs);

/**
 * GET /api/bots/:botId/details
 * Retrieves selected bot details
 */
router.get('/:botId/details', authenticate, botController.getBotDetails);

module.exports = router;
