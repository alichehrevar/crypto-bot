const mongoose = require('mongoose');
const BotBase = require('../../models/BotBase');
const logger = require('../../../logs/logger');

const bindBot = async (req, res, next) => {
    try {
        // Handle both 'id' (legacy/standard) and 'botId' (specific routes)
        const id = req.params.botId || req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid bot ID format.'
            });
        }

        const botBase = await BotBase.findById(id).lean();

        if (!botBase) {
            return res.status(404).json({
                success: false,
                message: 'Bot not found.'
            });
        }

        // Attach the found bot to the request object
        req.botBase = botBase;
        next();

    } catch (error) {
        logger.error('Middleware bindBot error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error processing bot ID.'
        });
    }
};

module.exports = bindBot;
