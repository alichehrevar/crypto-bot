// app/http/controllers/market/sectorController.js

const SectorService = require('../../../services/market/sectorService');
const logger = require('../../../../logs/logger'); // Assuming you have a logger

class SectorController {
    /**
     * Handles the request to get sector performance data.
     */
    async getPerformance(req, res) {
        try {
            const data = await SectorService.calculatePerformance();
            res.status(200).json({data, success: true});
        } catch (error) {
            logger.error('Error fetching sector performance:', error);
            res.status(500).json({ error: 'An error occurred while fetching sector performance data.', success: false });
        }
    }


    /**
     * Handles the request for fetching comparative sector rotation data.
     * @param {object} req - Express request object.
     * @param {object} res - Express response object.
     */
    async getRotationData(req, res) {
        try {
            const data = await SectorService.getSectorRotationData();
            res.status(200).json({data, success: true});
        } catch (error) {
            logger.error('Error fetching sector rotation data:', error);
            res.status(500).json({ error: 'Internal Server Error', success: false });
        }
    }
}

module.exports = new SectorController();
