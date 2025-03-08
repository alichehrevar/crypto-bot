// app/http/controllers/botController.js

const Bot = require('../../models/Bot');
const User = require('../../models/User');
const BotService = require('../../services/botService/BotService');

/**
 * Deploy a new bot.
 * This function ensures a valid user exists (creates one if needed),
 * sets required fields and default values, creates the bot, and registers it with the BotService.
 */
exports.deployBot = async (req, res) => {
    try {
        const botData = req.body;

        // Validate required fields.
        if (!botData.indicator || !botData.riskStrategy || !botData.strategy) {
            return res.status(400).json({ error: 'Indicator, riskStrategy, and strategy fields are required.' });
        }

        // Ensure there is a valid user; if none exists, create a dummy one.
        let user = await User.findOne({});
        if (!user) {
            user = await User.create({
                email: 'test@example.com',
                password: 'password123'
            });
            console.log('Created dummy user:', user.email);
        }
        botData.userId = user._id;

        // Set default values for bot configuration.
        // For marketInfo, assign baseFund and tradeFund defaults.
        botData.marketInfo = botData.marketInfo || {};
        botData.marketInfo.baseFund = (botData.marketInfo.baseFund !== undefined) ? botData.marketInfo.baseFund : 10000;
        botData.marketInfo.tradeFund = (botData.marketInfo.tradeFund !== undefined) ? botData.marketInfo.tradeFund : 50;
        // For tradeInfo, assign a default leverage.
        botData.tradeInfo = botData.tradeInfo || {};
        botData.tradeInfo.leverage = (botData.tradeInfo.leverage !== undefined) ? botData.tradeInfo.leverage : 1;

        // Set bot mode to live and mark as active.
        botData.mode = botData.mode || 'live';
        botData.active = true;

        // Create the bot.
        const newBot = await Bot.create(botData);
        // Register the new bot with BotService.
        BotService.addBot(newBot);
        res.status(201).json(newBot);
    } catch (error) {
        console.error('Error deploying bot:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Select bots for a given symbol and timeframe.
 * For each indicator in the provided (or default) list, this endpoint upserts a bot configuration.
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

        // Determine which indicators to upsert.
        let strategies = [];
        if (strategy) {
            strategies = [strategy];
        } else {
            strategies = ['MA_Crossover', 'RSI', 'MACD'];
        }

        // Define default configuration objects for each indicator.
        const defaultConfigs = {
            RSI: { period: 14, overbought: 70, oversold: 30 },
            MACD: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
            MA_Crossover: { shortPeriod: 5, longPeriod: 20 }
        };

        // For each indicator, upsert a bot configuration.
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
                        indicator: strat, // Use the indicator as the indicator field.
                        // Use a default risk strategy if not provided in the query.
                        riskStrategy: 'SimpleStrategy',
                        strategy: strat,
                        strategyParams: defaultConfigs[strat],
                        riskParams: { maxOpenTrades: 1 },
                        marketInfo: { state: 'active' },
                        tradeInfo: {},
                        active: true,
                        mode: 'paper',       // Default mode; adjust as needed.
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

        // If the bot is active, add it to the BotService.
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
        // If the bot's active state changed, update BotService accordingly.
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
        BotService.removeBot(bot);
        res.json({ message: 'Bot deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
