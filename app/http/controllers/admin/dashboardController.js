const User = require('../../../models/User');
const BotBase = require('../../../models/BotBase');
const logger = require("../../../../logs/logger");

exports.dashboardOverview = async (req, res) => {
    try {
        const usersCount = await User.countDocuments();
        const botsCount = await BotBase.countDocuments();

        res.json({
            success: true,
            data: {usersCount, botsCount}
        });
    } catch (error) {
        console.error('Error fetching reports:', error);
        logger.error(`Error fetching reports: ${error.message}`, { stack: error.stack });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch reports'
        });
    }
}
