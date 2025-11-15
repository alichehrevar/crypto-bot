const express = require('express');
const router = express.Router();
const n8nController = require('../../app/http/controllers/n8n/n8nController');
const authenticate = require('../../app/http/middleware/auth');

/**
 * @route   POST /api/ai/trigger-async
 * @desc    Trigger an ASYNC workflow (returns job ID immediately)
 * @access  Private
 */
router.post('/trigger-async', authenticate, n8nController.triggerAsync);

/**
 * @route   POST /api/ai/prompt/submit
 * @desc    Trigger an ASYNC workflow (returns job ID immediately)
 * @access  Private
 */
router.post('/prompt/submit', authenticate, n8nController.promptSubmission);

/**
 * @route   GET /api/ai/status/:id
 * @desc    Check the status of an ASYNC workflow job
 * @access  Private
 */
router.get('/status/:id', authenticate, n8nController.getJobStatus);

module.exports = router;
