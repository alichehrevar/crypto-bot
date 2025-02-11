const express = require('express');
const router = express.Router();
const currencyController = require('../app/http/controllers/currencyController');

router.get('/', currencyController.getCurrencies);

module.exports = router;
