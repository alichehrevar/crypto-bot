const DcaBot = require('../../models/DcaBot');
const MarketSnapshot = require('../../models/MarketSnapshot')
const BotManagerService = require('../../services/botService/BotManagerService');
const logger = require("../../../logs/logger");

// POST /api/dcabots
exports.createDcaBot = async (req, res) => {

    // 1. Extract accountId from request
    const { symbol, selectedTab, accountId } = req.body;

    let marketSnapshot;

    if (symbol && symbol !== 'undefined') {
        marketSnapshot = await MarketSnapshot.findById(symbol);
    } else {
        marketSnapshot = await MarketSnapshot.findOne({
            name: "Binance",
            symbol: "BTC",
            category: "Spot"
        });
    }

    if (!marketSnapshot) {
        return res.status(400).json({ error: 'Wrong symbol is selected.' });
    }

    // Validate Account ID presence
    if (!accountId) {
        return res.status(400).json({ error: 'Account ID is required.' });
    }

    try {
        const botData = {
            ...req.body,
            symbol: marketSnapshot.symbol,
            accountType: 'bingx',
            userId: req.user.id,
            accountId: accountId,
            active: true,
            direction: req.body.direction.toUpperCase(),
            marketType: 'SPOT',
            timeframe: '1m',
            riskStrategy: 'SimpleStrategy',
        };
        const dcaBot = new DcaBot(botData);
        await dcaBot.save();

        await BotManagerService.startBotInstance(dcaBot.id);

        res.status(201).json({data: dcaBot, success: true});
    } catch (error) {
        console.error("--- FULL ERROR ---");
        console.error(error);

        if (error.name === 'ValidationError') {
            logger.error('Validation error:', error.message)
            return res.status(400).json({
                message: "Validation failed. See 'errors' for details.",
                errors: error.errors
            });
        }

        return res.status(500).json({
            message: "An internal server error occurred.",
            error: error.message
        });
    }
};

// GET /api/dcabots
exports.getDcaBots = async (req, res) => {
    try {
        const bots = await DcaBot.find({ userId: req.user.id });
        res.status(200).json(bots);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// PATCH /api/dcabots/:id/enable
exports.enableDcaBot = async (req, res) => {
    try {
        const bot = await DcaBot.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            { status: 'RUNNING' },
            { new: true }
        );
        if (!bot) return res.status(404).json({ message: 'Bot not found' });

        await BotManagerService.startBotInstance(bot.id);
        res.status(200).json(bot);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// PATCH /api/dcabots/:id/disable
exports.disableDcaBot = async (req, res) => {
    try {
        const bot = await DcaBot.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            { status: 'DISABLED' },
            { new: true }
        );
        if (!bot) return res.status(404).json({ message: 'Bot not found' });

        BotManagerService.stopBotInstance(bot.id);
        res.status(200).json(bot);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
