const express = require('express');
const router = express.Router();
const indicatorsController = require('../app/http/controllers/indicatorsController');

router.get('/', indicatorsController.getIndicatorsList);

module.exports = router;
