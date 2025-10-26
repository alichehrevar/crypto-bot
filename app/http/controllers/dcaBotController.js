const DcaBot = require('../../models/DcaBot');
const MarketSnapshot = require('../../models/MarketSnapshot')
const BotManagerService = require('../../services/botService/BotManagerService');

// POST /api/dcabots
exports.createDcaBot = async (req, res) => {

    const { symbol, selectedTab } = req.body;

    if (!symbol) {
        return res.status(400).json({ message: 'Symbol is required', success: false });
    }

    const marketSnapshot = await MarketSnapshot.findById(symbol)
    if (!marketSnapshot) {
        return res.status(404).json({ message: 'Symbol not found', success: false });
    }

    try {
        const botData = {
            ...req.body,
            symbol: marketSnapshot.symbol,
            accountType: marketSnapshot.name.toLowerCase(),
            userId: req.user.id,
            active: true,
            direction: req.body,
            marketType: 'SPOT',
            timeframe: '1m',
            riskStrategy: 'SimpleStrategy',
        };
        const dcaBot = new DcaBot(botData);
        await dcaBot.save();

        // Optional: Add to a manager service that starts/stops bots
        await BotManagerService.startBotInstance(dcaBot.id);

        res.status(201).json({data: dcaBot, success: true});
    } catch (error) {
        // THIS IS THE MOST IMPORTANT PART
        console.error("--- FULL ERROR ---");
        console.error(error); // This will print the full object

        if (error.name === 'ValidationError') {
            // Send the detailed validation errors back
            return res.status(400).json({
                message: "Validation failed. See 'errors' for details.",
                errors: error.errors // 'error.errors' has the good stuff
            });
        }

        // For any other kind of error
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

        BotManagerService.stopBot(bot.id);
        res.status(200).json(bot);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
