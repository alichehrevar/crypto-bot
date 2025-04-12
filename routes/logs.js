// routes/logs.js
const express = require('express');
const router = express.Router();
const logController = require('../app/http/controllers/logController');

// Define GET /logs endpoint to retrieve logs.
router.get('/', logController.getLogs);

module.exports = router;
