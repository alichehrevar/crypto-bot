// routes/bot.js
const express = require('express');
const router = express.Router();
const Bot = require('../app/models/Bot');
const { validateBotParams } = require('../app/http/middleware/validation');
const botService = require('../app/services/BotService');

/**
 * POST /bots
 * Create a new bot configuration.
 */
router.post('/', validateBotParams, async (req, res) => {
    try {
        const bot = await Bot.create(req.body);
        if (bot.active) {
            botService.addBot(bot);
        }
        res.status(201).json(bot);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * GET /bots
 * Retrieve all bots.
 */
router.get('/', async (req, res) => {
    try {
        const bots = await Bot.find({});
        res.json(bots);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /bots/:id
 * Retrieve a single bot configuration by its ID.
 */
router.get('/:id', async (req, res) => {
    try {
        const bot = await Bot.findById(req.params.id);
        if (!bot) {
            return res.status(404).json({ error: 'Bot not found' });
        }
        res.json(bot);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /bots/:id
 * Update an existing bot configuration.
 */
router.put('/:id', validateBotParams, async (req, res) => {
    try {
        const bot = await Bot.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if (!bot) {
            return res.status(404).json({ error: 'Bot not found' });
        }
        // Update bot in the botService based on its active state.
        if (bot.active) {
            botService.updateBot(bot);
        } else {
            botService.removeBot(bot);
        }
        res.json(bot);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * DELETE /bots/:id
 * Delete a bot configuration.
 */
router.delete('/:id', async (req, res) => {
    try {
        const bot = await Bot.findByIdAndDelete(req.params.id);
        if (!bot) {
            return res.status(404).json({ error: 'Bot not found' });
        }
        // Remove the bot from botService if necessary.
        botService.removeBot(bot);
        res.json({ message: 'Bot deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
