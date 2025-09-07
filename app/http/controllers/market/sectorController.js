// app/http/controllers/market/sectorController.js

const SectorPerformanceService = require('../../../services/market/sectorService');
const logger = require('../../../../logs/logger'); // Assuming you have a logger

class SectorController {
    /**
     * Handles the request to get sector performance data.
     */
    async getPerformance(req, res) {
        try {
            const data = await SectorPerformanceService.calculatePerformance();
            res.status(200).json({data, success: true});
        } catch (error) {
            logger.error('Error fetching sector performance:', error);
            res.status(500).json({ error: 'An error occurred while fetching sector performance data.', success: false });
        }
    }
}

module.exports = new SectorController();
