// File: app/http/controllers/sentimentController.js

const sentimentService = require('../../../services/market/sentimentService.js');

/**
 * Handles the request to get the current market sentiment score.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
exports.getSentiment = async (req, res) => {
    try {
        const score = await sentimentService.getFearAndGreedIndex();
        res.status(200).json({ data: { score: score }, success: true });
    } catch (error) {
        // The service layer has already logged the detailed error
        res.status(500).json({ error: error.message, success: false });
    }
};

/**
 * Handles the request to get all economic events.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
exports.getEvents = async (req, res) => {
    try {
        const events = await sentimentService.getEconomicEvents();
        res.status(200).json({ data: events, success: true });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching events.', success: false });
    }
};
