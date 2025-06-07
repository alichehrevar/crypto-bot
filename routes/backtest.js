const express = require('express');
const router = express.Router();
const authenticate     = require('../app/http/middleware/auth');
const backtestController = require('../app/http/controllers/backtestController');

router.post('/run', authenticate, backtestController.run);

module.exports = router;
