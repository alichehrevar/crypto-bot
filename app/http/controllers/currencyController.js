// app/http/controllers/currenciesController.js

const Currency = require('../../models/Currency');

/**
 * getCurrencies
 *
 * Retrieves all active currencies from the Currency collection, sorted by symbol.
 */
exports.getCurrencies = async (req, res) => {
    try {
        const docs = await Currency
            .find({ active: true })
            .sort({ symbol: 1 });

        // If you only need the symbol strings, uncomment the next line:
        // const symbols = docs.map(c => c.symbol);

        res.json({
            success: true,
            data: docs  // or: data: symbols
        });
    } catch (error) {
        console.error('Error fetching currencies:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch currencies'
        });
    }
};
