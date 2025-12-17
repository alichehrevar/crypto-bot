const BotLog = require('../../../models/BotLog');
const mongoose = require('mongoose');
const logger = require("../../../../logs/logger");

/**
 * Controller for handling log retrieval.
 */
class LogController {

    /**
     * Get paginated logs for a specific bot with optional search.
     * @param {import('express').Request} req
     * @param {import('express').Response} res
     */
    async getBotLogs(req, res) {
        try {
            const { botId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(botId)) {
                return res.status(400).json({ message: 'Invalid botId format.' });
            }

            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 100;
            const skip = (page - 1) * limit;
            // Extract search term
            const search = req.query.search ? String(req.query.search).trim() : null;

            // --- Base Query ---
            // Note: Adjust 'meta.botId' if your actual data uses a different structure
            // based on how you save it. Your sample data showed nested 'meta.metadata.botId',
            // but your index was 'meta.botId'. I'll stick to your index definition.
            const query = { 'meta.botId': botId };

            // --- Apply Search if present ---
            if (search) {
                // Case-insensitive regex search on the message field
                // For high volume, consider a text index, but regex works for standard admin UIs.
                query.message = { $regex: search, $options: 'i' };
            }

            const totalLogs = await BotLog.countDocuments(query);

            const logs = await BotLog.find(query)
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limit)
                .lean();

            res.status(200).json({
                data: {
                    logs: logs,
                    pagination: {
                        totalLogs,
                        totalPages: Math.ceil(totalLogs / limit),
                        currentPage: page,
                        limit: limit,
                    },
                },
                success: true,
            });

        } catch (error) {
            logger.error('Error fetching bot logs:', error);
            console.error('Error fetching bot logs:', error);
            res.status(500).json({ message: 'Internal server error while fetching logs.', success: false });
        }
    }
}

// Export a singleton instance
module.exports = new LogController();
