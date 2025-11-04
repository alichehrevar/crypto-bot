// routes/logs.js
const express = require('express');
const router = express.Router();
const logController = require('../../app/http/controllers/admin/logController');
const authenticate = require('../../app/http/middleware/auth');

/**
 * GET /api/logs/:botId
 *
 * Retrieves a paginated list of logs for a specific bot.
 * Protected by authentication.
 *
 * Query Params:
 * - ?page=1   (number) - The page number to retrieve.
 * - ?limit=50 (number) - The number of logs per page.
 */
router.get('/:botId', authenticate, logController.getBotLogs);

module.exports = router;
