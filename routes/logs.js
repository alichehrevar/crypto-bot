// routes/logs.js
const express = require('express');
const router = express.Router();
const logController = require('../app/http/controllers/logController');
const authenticate = require('../app/http/middleware/auth');

// Define GET /logs endpoint to retrieve logs.
router.get('/files', authenticate, logController.getLogsFiles);
router.get('/file/:filename', authenticate, logController.getLogFile);

module.exports = router;
