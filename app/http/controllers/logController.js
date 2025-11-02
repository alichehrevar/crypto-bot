const BotLog = require('../../models/BotLog');
const mongoose = require('mongoose');

/**
 * Controller for handling log retrieval.
 */
class LogController {

    /**
     * Get paginated logs for a specific bot.
     * @param {import('express').Request} req
     * @param {import('express').Response} res
     */
    async getBotLogs(req, res) {
        try {
            const { botId } = req.params;

            // --- Validation ---
            if (!mongoose.Types.ObjectId.isValid(botId)) {
                return res.status(400).json({ message: 'Invalid botId format.' });
            }

            // --- Pagination ---
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 100; // Default 100 logs per page
            const skip = (page - 1) * limit;

            // --- Query ---
            // We'll create the query for the botId
            const query = { 'meta.botId': botId };

            // 1. Get the total count of logs for this bot for pagination
            const totalLogs = await BotLog.countDocuments(query);

            // 2. Get the paginated data, sorted newest first
            const logs = await BotLog.find(query)
                .sort({ timestamp: -1 }) // Newest logs first
                .skip(skip)
                .limit(limit)
                .lean(); // Use .lean() for faster read-only queries

            // --- Response ---
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
            console.error('Error fetching bot logs:', error);
            res.status(500).json({ message: 'Internal server error while fetching logs.', success: false });
        }
    }
}

// Export a singleton instance
module.exports = new LogController();
