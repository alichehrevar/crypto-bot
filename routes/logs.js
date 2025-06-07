// routes/logs.js
const express = require('express');
const router = express.Router();
const logController = require('../app/http/controllers/logController');

// Define GET /logs endpoint to retrieve logs.
router.get('/files', logController.getLogsFiles);
router.get('/file/:filename', logController.getLogFile);

module.exports = router;
