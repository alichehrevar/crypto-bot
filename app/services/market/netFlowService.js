const NetFlow = require('../../models/NetFlow'); // Adjust path as needed

/**
 * Fetches the latest liquidity flow data from the database.
 */
const getLiquidityFlows = async () => {
    try {
        // Fetch the 10 most recent records for 'bitcoin', sorted by date descending.
        // The cron job already calculated the 7-day MA.
        const history = await NetFlow.find({ coinId: 'bitcoin' })
            .sort({ date: -1 })
            .limit(10);

        if (!history || history.length === 0) {
            // This can happen if the cron job hasn't run yet.
            // You could return an empty array or a specific message.
            return { netFlows: { history: [] } };
        }

        // The data is stored newest-first, but the chart expects oldest-first.
        const historyForChart = history.reverse();

        return { netFlows: { history: historyForChart } };

    } catch (error) {
        console.error('Error fetching liquidity flows from DB:', error.message);
        throw new Error('Failed to fetch net flow data from the database.');
    }
};

module.exports = {
    getLiquidityFlows,
};
