const express = require('express');
const router = express.Router();
const n8nController = require('../../app/http/controllers/n8n/n8nController');
const authenticate = require('../../app/http/middleware/auth');

/**
 * @route   POST /api/n8n/trigger-async
 * @desc    Trigger an ASYNC workflow (returns job ID immediately)
 * @access  Private
 *
 * @body    {
 * "webhookPath": "/webhook/my-long-workflow",
 * "payload": { "key1": "value1", "someData": "..." }
 * }
 */
router.post('/trigger-async', authenticate, n8nController.triggerAsync);

/**
 * @route   GET /api/n8n/status/:id
 * @desc    Check the status of an ASYNC workflow job
 * @access  Private
 */
router.get('/status/:id', authenticate, n8nController.getJobStatus);

module.exports = router;
