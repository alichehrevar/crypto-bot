// app/http/controllers/currenciesController.js

const Currency = require('../../models/Currency');
const logger = require("../../../logs/logger");

/**
 * getCurrencies
 *
 * Retrieves all active currencies from the Currency collection, sorted by symbol.
 */
exports.getCurrencies = async (req, res) => {
    try {
        const docs = await Currency
            .find({ is_active: true, type: 'coin' })
            .sort({ symbol: 1 });

        res.json({
            success: true,
            data: docs
        });
    } catch (error) {
        console.error('Error fetching currencies:', error);
        logger.error(`Error fetching currencies: ${error.message}`, { stack: error.stack });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch currencies'
        });
    }
};
