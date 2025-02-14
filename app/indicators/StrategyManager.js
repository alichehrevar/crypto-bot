class StrategyManager {
    constructor() {
        // Use a Map to store indicators by name.
        this.strategies = new Map();
    }

    /**
     * Registers a strategy instance under a unique strategy name.
     *
     * @param {string} strategyName - The unique name for this strategy.
     * @param {object} strategyInstance - The strategy instance (which must have a calculateSignal() method).
     */
    registerStrategy(strategyName, strategyInstance) {
        this.strategies.set(strategyName, strategyInstance);
    }

    /**
     * Unregisters a strategy by its name.
     *
     * @param {string} strategyName - The name of the strategy to remove.
     */
    unregisterStrategy(strategyName) {
        this.strategies.delete(strategyName);
    }

    /**
     * Processes signals for all registered indicators using the provided candle data.
     * If a strategy throws an error during signal calculation, its signal will be defaulted to "HOLD".
     *
     * @param {Array} candles - An array of candle data.
     * @returns {Object} An object with strategy names as keys and the calculated signals as values.
     */
    processSignals(candles) {
        const signals = {};
        for (const [strategyName, strategy] of this.strategies.entries()) {
            try {
                signals[strategyName] = strategy.calculateSignal(candles);
            } catch (error) {
                console.error(`Error processing strategy "${strategyName}": ${error.message}`);
                signals[strategyName] = 'HOLD';
            }
        }
        return signals;
    }

    /**
     * Processes the signal for a specific registered strategy.
     *
     * @param {string} strategyName - The name of the strategy to process.
     * @param {Array} candles - An array of candle data.
     * @returns {String} The signal produced by the strategy.
     * @throws {Error} If the specified strategy is not registered.
     */
    processSignalForStrategy(strategyName, candles) {
        const strategy = this.strategies.get(strategyName);
        if (!strategy) {
            throw new Error(`Strategy ${strategyName} not registered`);
        }

        try {
            return strategy.calculateSignal(candles);
        } catch (error) {
            console.error(`Error processing strategy "${strategyName}": ${error.message}`);
            return 'HOLD';
        }
    }
}

module.exports = StrategyManager;
