const Bot = require('../../models/Bot');
const User = require('../../models/User');
const { validateBotParams } = require('../middleware/validation');
const BotService = require('../../services/botService/BotService');
const mongoose = require('mongoose');

/**
 * Deploy a new bot.
 * This function ensures a valid user exists, then creates a new bot and registers it.
 */
exports.deployBot = async (req, res) => {
    try {
        const botData = req.body;

        // Ensure indicator, riskStrategy, and strategy fields are provided.
        if (!botData.indicator || !botData.riskStrategy || !botData.strategy) {
            return res.status(400).json({ error: 'Indicator, riskStrategy, and strategy fields are required.' });
        }

        // Ensure there is a valid user. If not, create a dummy user.
        let user = await User.findOne({});
        if (!user) {
            user = await User.create({
                email: 'test@example.com',
                password: 'password123'
            });
            console.log('Created dummy user:', user);
        }
        botData.userId = user._id;

        const newBot = await Bot.create(botData);
        // Register the bot in the BotService.
        BotService.addBot(newBot);
        res.status(201).json(newBot);
    } catch (error) {
        console.error('Error deploying bot:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Select bots for a given symbol/timeframe.
 * If a bot for a specific indicator does not exist, upsert it with default configuration.
 */
exports.selectBots = async (req, res) => {
    try {
        let { symbol, timeframe, strategy } = req.query;
        if (!symbol || !timeframe) {
            return res.status(400).json({ error: 'Symbol and timeframe are required' });
        }

        // Normalize symbol and timeframe.
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
        const normSymbol = symbol.toUpperCase();
        const normTimeframe = timeframe.toLowerCase();

        // Determine which indicators to process.
        let strategies = [];
        if (strategy) {
            strategies = [strategy];
        } else {
            strategies = ['MA_Crossover', 'RSI', 'MACD'];
        }

        // Define default configurations for each indicator.
        const defaultConfigs = {
            RSI: { period: 14, overbought: 70, oversold: 30 },
            MACD: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
            MA_Crossover: { shortPeriod: 5, longPeriod: 20 }
        };

        // Upsert a bot for each indicator strategy.
        for (const strat of strategies) {
            await Bot.findOneAndUpdate(
                {
                    symbol: normSymbol,
                    timeframe: normTimeframe,
                    strategy: strat
                },
                {
                    $set: {
                        name: `${normSymbol} ${normTimeframe} ${strat} Bot`,
                        indicator: strat, // set indicator field
                        riskStrategy: botData.riskStrategy || 'SimpleStrategy', // you might pass a default or use one provided in query
                        strategy: strat,
                        strategyParams: defaultConfigs[strat],
                        riskParams: { maxOpenTrades: 1 },
                        marketInfo: { state: 'active' },
                        tradeInfo: {},
                        active: true,
                        mode: 'paper',
                        paperBalance: 10000
                    }
                },
                { upsert: true, new: true }
            );
            console.log(`Ensured bot for ${normSymbol} ${normTimeframe} ${strat}`);
        }

        // Fetch and return all bots for the given symbol and timeframe.
        const bots = await Bot.find({
            symbol: normSymbol,
            timeframe: normTimeframe
        });
        res.json(bots);
    } catch (error) {
        console.error('Error in bots select endpoint:', error);
        res.status(500).json({ error: 'Failed to select or create bot', details: error.message });
    }
};

/**
 * Create a new bot configuration.
 */
exports.createBot = async (req, res) => {
    try {
        const botData = req.body;
        const bot = new Bot(botData);
        await bot.save();

        // Optionally, if the bot is active, add it to the running BotService.
        if (bot.active) {
            BotService.addBot(bot);
        }

        res.status(201).json(bot);
    } catch (error) {
        console.error("Error creating bot:", error);
        res.status(500).json({ error: error.message });
    }
};


/**
 * Retrieve all bots.
 */
exports.getBots = async (req, res) => {
    try {
        const bots = await Bot.find({});
        res.json(bots);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Retrieve a single bot by ID.
 */
exports.getBotById = async (req, res) => {
    try {
        const bot = await Bot.findById(req.params.id);
        if (!bot) {
            return res.status(404).json({ error: 'Bot not found' });
        }
        res.json(bot);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Update an existing bot configuration.
 */
exports.updateBot = async (req, res) => {
    try {
        const bot = await Bot.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if (!bot) {
            return res.status(404).json({ error: 'Bot not found' });
        }
        // Optionally update BotService if bot.active changes.
        if (bot.active) {
            BotService.updateBot(bot);
        } else {
            BotService.removeBot(bot);
        }
        res.json(bot);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

/**
 * Delete a bot configuration.
 */
exports.deleteBot = async (req, res) => {
    try {
        const bot = await Bot.findByIdAndDelete(req.params.id);
        if (!bot) {
            return res.status(404).json({ error: 'Bot not found' });
        }
        // Optionally remove bot from BotService.
        BotService.removeBot(bot);
        res.json({ message: 'Bot deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
