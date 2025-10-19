const DcaBot = require('../../models/DcaBot');
const BotManagerService = require('../../services/botService/BotManagerService');

// POST /api/dcabots
exports.createDcaBot = async (req, res) => {
    try {
        const botData = { ...req.body, userId: req.user.id };
        const dcaBot = new DcaBot(botData);
        await dcaBot.save();

        // Optional: Add to a manager service that starts/stops bots
        BotManagerService.addBot(dcaBot.id);

        res.status(201).json(dcaBot);
    } catch (error) {
        res.status(400).json({ message: error.message });
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
