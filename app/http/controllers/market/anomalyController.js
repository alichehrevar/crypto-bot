const anomalyService = require('../../../services/market/anomalyService');
const { format } = require('timeago.js');

/**
 * Handles the request to get the latest market anomalies.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
async function getAnomalies(req, res) {
    try {
        const anomalies = await anomalyService.getLatestAnomalies();

        // Format the data to match the frontend component's expectations
        const formattedAnomalies = anomalies.map(anomaly => ({
            id: anomaly._id,
            type: anomaly.type,
            asset: anomaly.asset,
            detail: anomaly.detail,
            time: format(anomaly.createdAt), // Convert timestamp to "X minutes ago"
            severity: anomaly.severity,
        }));

        res.status(200).json({data: formattedAnomalies, success: true});
    } catch (error) {
        res.status(500).json({ error: error.message, success: false });
    }
}

module.exports = {
    getAnomalies,
};
