const BaseIndicator = require('./BaseIndicator');
const { loadDynamicStrategy } = require('../../../utils/StrategyLoader');
const logger = require("../../../logs/logger");

class N8NBotRunner extends BaseIndicator {
    /**
     * @param {Object} params - Must contain:
     * - jobId: string (The N8nJobResponse ID)
     * - generatedCode: string (The actual code, passed from BotService)
     * - ...other strategy params
     */
    constructor(params) {
        super(params);

        if (!params.jobId || !params.generatedCode) {
            throw new Error("N8NBotRunner requires 'jobId' and 'generatedCode' in params.");
        }

        // Load the class definition dynamically
        const DynamicClass = loadDynamicStrategy(params.jobId, params.generatedCode);

        // Instantiate the specific AI strategy
        this.strategyInstance = new DynamicClass(params);
    }

    /**
     * @param {Array} candles - Standard OHLCV candles
     */
    calculateSignal(candles) {
        if (!this.strategyInstance) return 'HOLD';

        try {
            // Forward the calculation to the AI strategy
            return this.strategyInstance.calculateSignal(candles);
        } catch (err) {
            logger.error(`[N8NBotRunner] Error in strategy execution: ${err.message}`);
            console.error(`[N8NBotRunner] Error in strategy execution: ${err.message}`);
            return 'HOLD';
        }
    }

    updateConfig(newConfig) {
        if (this.strategyInstance && typeof this.strategyInstance.updateConfig === 'function') {
            this.strategyInstance.updateConfig(newConfig);
        }
    }
}

module.exports = N8NBotRunner;
