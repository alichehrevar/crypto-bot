// app/http/controllers/botController.js

const Bot = require('../../models/Bot');
const User = require('../../models/User');
const BotService = require('../../services/botService/BotService');

const defaultStrategyParams = {
    RSI:         { period: 14, overbought: 70, oversold: 30 },
    MACD:        { shortPeriod: 12, longPeriod: 26, signalPeriod: 9 },
    MA_Crossover:{ shortPeriod: 5,  longPeriod: 20 },
    Donchian:    { period: 20 },
    Volume:      { period: 14 },
    Heikin_Ashi: {},
    Combined_RSI_MACD: { parameters: { confirmation_window: 6 } },
    Bollinger_Bands:   { period: 20, stdDev: 2 },
    Stochastic_RSI:    { period: 14, kPeriod: 3, dPeriod: 3 }
};

/**
 * Deploy a new bot.
 * This function ensures a valid user exists (creates one if needed),
 * sets required fields and default values, creates the bot, and registers it with the BotService.
 */
exports.deployBot = async (req, res) => {
    try {
        const user = await User.findById(req.user?.id);
        if (!user) return res.status(401).json({ error: 'User not found.' });

        const {
            name,
            symbol,
            baseFund,
            tradeFund,
            leverage,
            riskStrategy,
            takeProfit,
            stopLoss,

            // primary
            indicator,
            timeframe,
            strategyParams,

            // zero or more extras
            additionalIndicators = []
        } = req.body;


        // construct one–or–many indicator entries
        const indicators = [
            {
                name:      indicator,
                timeframe,
                params:    strategyParams || defaultStrategyParams[indicator] || {}
            },
            ...additionalIndicators.map(ai => ({
                name:      ai.indicator,
                timeframe: ai.timeframe,
                params:    defaultStrategyParams[ai.indicator] || {}
            }))
        ];

        // create the bot document
        const bot = await Bot.create({
            name,
            symbol,
            indicators,                  // <-- new multi-indicator array

            // money / trade config
            riskStrategy,
            tradeInfo: {
                takeProfit,
                stopLoss,
                leverage,
            },
            marketInfo: {
                baseFund:  baseFund  != null ? baseFund  : 10000,
                tradeFund: tradeFund != null ? tradeFund : 50
            },

            timeframe: timeframe,

            // tie to user + go live
            userId:  user._id,
            mode:    'live',
            active:  true
        });

        // now register this bot in memory
        // (we renamed your old addBot → registerBot)
        BotService.registerBot(bot);

        res.status(201).json(bot);
    }
    catch (err) {
        console.error('Error deploying bot:', err);
        res.status(500).json({ error: err.message });
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
