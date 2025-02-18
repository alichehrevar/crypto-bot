class StrategyManager {
    constructor() {
        // Map of strategy instances keyed by a unique strategy name.
        this.strategies = new Map();
    }

    /**
     * Registers a strategy instance under a unique strategy name.
     * @param {string} strategyName - The unique identifier for this strategy.
     * @param {object} strategyInstance - The strategy instance (should implement calculateSignal, updateConfig, etc.).
     */
    registerStrategy(strategyName, strategyInstance) {
        this.strategies.set(strategyName, strategyInstance);
        console.log(`Registered strategy: ${strategyName}`);
    }

    /**
     * Unregisters a strategy by its name.
     * @param {string} strategyName - The strategy to remove.
     */
    unregisterStrategy(strategyName) {
        this.strategies.delete(strategyName);
        console.log(`Unregistered strategy: ${strategyName}`);
    }

    /**
     * Updates the configuration for a given strategy.
     * @param {string} strategyName - The strategy identifier.
     * @param {object} config - New configuration parameters.
     */
    configureStrategy(strategyName, config) {
        const strategy = this.strategies.get(strategyName);
        if (!strategy) {
            throw new Error(`Strategy ${strategyName} not registered`);
        }
        if (typeof strategy.updateConfig === 'function') {
            strategy.updateConfig(config);
            console.log(`Updated configuration for strategy ${strategyName}`);
        } else {
            Object.assign(strategy, config);
            console.log(`Merged configuration for strategy ${strategyName}`);
        }
    }

    /**
     * Processes signals for all registered strategies using the provided candle data.
     * @param {Array} candles - Array of candle data.
     * @returns {Object} Mapping of strategy names to their calculated signals.
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
     * Processes the signal for a specific strategy.
     * @param {string} strategyName - The strategy identifier.
     * @param {Array} candles - Array of candle data.
     * @returns {string} The calculated signal.
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

    /**
     * Computes a consensus signal from all registered strategies.
     * @param {Array} candles - Array of candle data.
     * @param {string} method - e.g., "weighted" or "consensus" (stub implementation).
     * @returns {string} The consensus signal.
     */
    consensusSignal(candles, method = 'weighted') {
        const signals = this.processSignals(candles);
        // Stub: simple consensus logic.
        if (Object.values(signals).includes('BUY')) return 'BUY';
        if (Object.values(signals).includes('SELL')) return 'SELL';
        return 'HOLD';
    }

    /**
     * Executes a strategy given risk parameters and trades.
     * @param {string} strategyName - The strategy identifier.
     * @param {object} riskParams - Risk parameters.
     * @param {Array} trades - Collected trades.
     * @returns {any} Execution result.
     */
    executeStrategy(strategyName, riskParams, trades) {
        const strategy = this.strategies.get(strategyName);
        if (!strategy) {
            throw new Error(`Strategy ${strategyName} not registered`);
        }
        if (typeof strategy.execute === 'function') {
            return strategy.execute(riskParams, trades);
        } else {
            console.warn(`Strategy ${strategyName} does not implement execute()`);
            return null;
        }
    }
}

module.exports = StrategyManager;
