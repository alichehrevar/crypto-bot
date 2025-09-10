const netFlowService = require('../../../services/market/netFlowService');

/**
 * Handles the request to get exchange and stablecoin net flow data.
 */
const getNetFlows = async (req, res) => {
    try {
        const data = await netFlowService.getLiquidityFlows();
        res.status(200).json({data, success: true});
    } catch (error) {
        res.status(500).json({ error: error.message, success: false });
    }
};

module.exports = {
    getNetFlows,
};
