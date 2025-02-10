const Bot = require('../../models/Bot');

/**
 * Create a new bot configuration.
 */
exports.createBot = async (req, res) => {
    try {
        const botData = req.body;
        const bot = new Bot(botData);
        await bot.save();
        res.status(201).json(bot);
    } catch (error) {
        console.error("Error creating bot:", error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Retrieve a bot configuration by botId.
 */
exports.getBot = async (req, res) => {
    try {
        const { botId } = req.params;
        const bot = await Bot.findOne({ botId });
        if (!bot) {
            return res.status(404).json({ error: 'Bot not found' });
        }
        res.status(200).json(bot);
    } catch (error) {
        console.error("Error fetching bot:", error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Update an existing bot configuration.
 */
exports.updateBot = async (req, res) => {
    try {
        const { botId } = req.params;
        const updateData = req.body;
        const bot = await Bot.findOneAndUpdate({ botId }, updateData, { new: true });
        if (!bot) {
            return res.status(404).json({ error: 'Bot not found' });
        }
        res.status(200).json(bot);
    } catch (error) {
        console.error("Error updating bot:", error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Delete a bot configuration.
 */
exports.deleteBot = async (req, res) => {
    try {
        const { botId } = req.params;
        const bot = await Bot.findOneAndDelete({ botId });
        if (!bot) {
            return res.status(404).json({ error: 'Bot not found' });
        }
        res.status(200).json({ message: 'Bot deleted successfully' });
    } catch (error) {
        console.error("Error deleting bot:", error);
        res.status(500).json({ error: error.message });
    }
};
