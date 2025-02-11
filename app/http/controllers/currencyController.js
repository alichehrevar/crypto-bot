const Candle = require('../../models/Candle');

/**
 * getCurrencies
 *
 * Retrieves all distinct currency symbols from the Candle collection.
 */
exports.getCurrencies = async (req, res) => {
    try {
        // Get distinct symbols from Candle collection.
        const symbols = await Candle.distinct('symbol');
        // Sort alphabetically.
        symbols.sort();
        res.json({
            success: true,
            data: symbols
        });
    } catch (error) {
        console.error('Error fetching currencies:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch currencies'
        });
    }
};
