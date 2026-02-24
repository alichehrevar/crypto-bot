const express = require('express');
const router = express.Router();
const settingsController = require('../../app/http/controllers/admin/indicatorSettingsController');
const authorize = require('../../app/http/middleware/authorize');

// GET /api/admin/indicator-settings
router.get('/', authorize(['admin']), settingsController.getSettings);

// PUT /api/admin/indicator-settings
router.put('/', authorize(['admin']), settingsController.updateSettings);

module.exports = router;
