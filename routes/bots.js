// routes/bot.js
const express = require('express');
const router = express.Router();
const Bot = require('../app/models/Bot');
const { validateBotParams } = require('../app/http/middleware/validation');
const botService = require('../app/services/BotService');

/**
 * GET /bots/select
 * Retrieve all bots with calculated strategy.
 */
router.get('/select', async (req, res) => {
    try {
        let { symbol, timeframe } = req.query;
        if (!symbol || !timeframe) {
            return res.status(400).json({ error: 'Symbol and timeframe are required' });
        }

        // Normalize symbol: if it doesn't contain a slash, insert one for known quote currencies.
        symbol = symbol.toString().trim();
        timeframe = timeframe.toString().trim();
        if (!symbol.includes('/')) {
            const upperSymbol = symbol.toUpperCase();
            if (upperSymbol.endsWith('USDT')) {
                symbol = upperSymbol.slice(0, -4) + '/USDT';
            } else if (upperSymbol.endsWith('USDC')) {
                symbol = upperSymbol.slice(0, -4) + '/USDC';
            } else {
                return res.status(400).json({
                    error: 'Symbol format is invalid. Expected format: BASE/QUOTE (e.g. BTC/USDT)'
                });
            }
        }

        // Normalize final values.
        const normSymbol = symbol.toUpperCase(); // e.g., "BTC/USDT"
        const normTimeframe = timeframe.toLowerCase(); // e.g., "1h"

        // Supported strategies.
        const strategies = ['MA_Crossover', 'RSI', 'MACD'];

        // Define default configuration objects for each strategy.
        const defaultConfigs = {
            RSI: { period: 14, overbought: 70, oversold: 30 },
            MACD: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
            MA_Crossover: { shortPeriod: 5, longPeriod: 20 }
        };

        // For each supported strategy, either create or update a bot.
        for (const strat of strategies) {
            // Try to find an existing bot for the given symbol, timeframe, and strategy.
            let bot = await Bot.findOne({
                symbol: normSymbol,
                timeframe: normTimeframe,
                strategy: strat
            });

            if (!bot) {
                // Create a new bot if none exists.
                const newBot = new Bot({
                    name: `${normSymbol} ${normTimeframe} ${strat} Bot`,
                    symbol: normSymbol,
                    timeframe: normTimeframe,
                    strategy: strat,
                    strategyParams: defaultConfigs[strat],
                    riskParams: { maxOpenTrades: 1 },
                    marketInfo: { state: 'active' },
                    tradeInfo: {},
                    active: true,
                    mode: 'paper',
                    paperBalance: 10000
                });
                await newBot.save();
                console.log(`Created new bot for ${normSymbol} ${normTimeframe} ${strat}`);
            } else if (strat === 'RSI') {
                // For RSI bots, ensure they always have valid strategyParams.
                if (!bot.strategyParams || typeof bot.strategyParams !== 'object' || Object.keys(bot.strategyParams).length === 0) {
                    bot.strategyParams = defaultConfigs.RSI;
                    await bot.save();
                    console.log(`Updated existing RSI bot for ${normSymbol} ${normTimeframe} with default parameters`);
                } else {
                    console.log(`Found existing RSI bot for ${normSymbol} ${normTimeframe}`);
                }
            } else {
                console.log(`Found existing bot for ${normSymbol} ${normTimeframe} ${strat}`);
            }
        }

        // After processing all strategies, fetch and return all bots for the given symbol and timeframe.
        const bots = await Bot.find({
            symbol: normSymbol,
            timeframe: normTimeframe
        });
        res.json(bots);
    } catch (error) {
        console.error('Error in bots select endpoint:', error);
        res.status(500).json({ error: 'Failed to select or create bot', details: error.message });
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
        res.status(500).json({
            error: 'Failed to select or create bot',
            details: error.message
        });
    }
});

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
