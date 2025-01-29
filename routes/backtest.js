const express = require('express');
const router = express.Router();
const backtestService = require('../app/services/BacktestService');

router.post('/run', async (req, res) => {
    try {
        const result = await backtestService.run(req.body);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
