const express = require('express');
const router = express.Router();
const authenticate     = require('../app/http/middleware/auth');
const backtestController = require('../app/http/controllers/backtestController');

router.post('/run', authenticate, backtestController.run);
router.get('/history', authenticate, backtestController.listRuns);
router.get('/:id', authenticate, backtestController.getRunById);

module.exports = router;
