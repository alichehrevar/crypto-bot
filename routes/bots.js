const express = require('express');
const router = express.Router();
const Bot = require('../app/models/Bot');
const botService = require('../app/services/BotService');

router.post('/', async (req, res) => {
    try {
        const bot = await Bot.create(req.body);
        if (bot.active) botService.addBot(bot);
        res.status(201).json(bot);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const bots = await Bot.find();
        res.json(bots);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add PUT and DELETE endpoints similarly

module.exports = router;
