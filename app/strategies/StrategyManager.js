class StrategyManager {
    constructor() {
        // Use a Map to store strategies by name.
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
        console.log(`Registered strategy: ${strategyName}`);
    }

    /**
     * Unregisters a strategy by its name.
     *
     * @param {string} strategyName - The name of the strategy to remove.
     */
    unregisterStrategy(strategyName) {
        this.strategies.delete(strategyName);
        console.log(`Unregistered strategy: ${strategyName}`);
    }

    /**
     * Updates the configuration for a given strategy.
     * It merges the new configuration with the current configuration and calls the strategy's updateConfig method if available.
     *
     * @param {string} strategyName - The name of the strategy.
     * @param {object} newConfig - New configuration object.
     * @returns {object} The updated configuration.
     * @throws {Error} If the specified strategy is not registered.
     */
    configureStrategy(strategyName, newConfig) {
        const strategy = this.strategies.get(strategyName);
        if (!strategy) {
            throw new Error(`Strategy ${strategyName} not registered`);
        }

        // Merge current configuration with newConfig.
        // This assumes the strategy instance stores its configuration in a property named `config` (or similar).
        // If not, you can directly replace or handle it accordingly.
        const updatedConfig = { ...strategy.config, ...newConfig };
        strategy.config = updatedConfig; // update internal configuration

        // If the strategy implements an updateConfig() method, call it.
        if (typeof strategy.updateConfig === 'function') {
            strategy.updateConfig(updatedConfig);
            console.log(`Updated configuration for strategy "${strategyName}":`, updatedConfig);
        } else {
            console.warn(`Strategy "${strategyName}" does not implement updateConfig(). Configuration updated internally.`);
        }

        return updatedConfig;
    }

    /**
     * Sets leverage for a strategy.
     *
     * @param {string} strategyName - The name of the strategy.
     * @param {object} params - An object containing side and leverage.
     */
    setLeverage(strategyName, params) {
        const strategy = this.strategies.get(strategyName);
        if (!strategy) throw new Error(`Strategy ${strategyName} not registered`);
        if (typeof strategy.setLeverage === 'function') {
            strategy.setLeverage(params);
            console.log(`Set leverage for strategy "${strategyName}":`, params);
        } else {
            console.warn(`Strategy "${strategyName}" does not implement setLeverage().`);
        }
    }

    /**
     * Sets the position details for a strategy.
     *
     * @param {string} strategyName - The name of the strategy.
     * @param {object} params - An object containing position details (e.g., hedge/single mode).
     */
    setPosition(strategyName, params) {
        const strategy = this.strategies.get(strategyName);
        if (!strategy) throw new Error(`Strategy ${strategyName} not registered`);
        if (typeof strategy.setPosition === 'function') {
            strategy.setPosition(params);
            console.log(`Set position for strategy "${strategyName}":`, params);
        } else {
            console.warn(`Strategy "${strategyName}" does not implement setPosition().`);
        }
    }

    /**
     * Sets margin details for a strategy.
     *
     * @param {string} strategyName - The name of the strategy.
     * @param {object} params - An object containing margin parameters (e.g., cross/isolated, manager, mode, enforce).
     */
    setMargin(strategyName, params) {
        const strategy = this.strategies.get(strategyName);
        if (!strategy) throw new Error(`Strategy ${strategyName} not registered`);
        if (typeof strategy.setMargin === 'function') {
            strategy.setMargin(params);
            console.log(`Set margin for strategy "${strategyName}":`, params);
        } else {
            console.warn(`Strategy "${strategyName}" does not implement setMargin().`);
        }
    }

    /**
     * Sets risk limits for a strategy.
     *
     * @param {string} strategyName - The name of the strategy.
     * @param {object} limits - An object containing risk limits (e.g., daily loss, position count).
     */
    setLimits(strategyName, limits) {
        const strategy = this.strategies.get(strategyName);
        if (!strategy) throw new Error(`Strategy ${strategyName} not registered`);
        if (typeof strategy.setLimits === 'function') {
            strategy.setLimits(limits);
            console.log(`Set limits for strategy "${strategyName}":`, limits);
        } else {
            console.warn(`Strategy "${strategyName}" does not implement setLimits().`);
        }
    }

    /**
     * Collects trade data from a strategy.
     *
     * @param {string} strategyName - The name of the strategy.
     * @param {object} trade - Trade data to collect.
     */
    collectTrade(strategyName, trade) {
        const strategy = this.strategies.get(strategyName);
        if (!strategy) throw new Error(`Strategy ${strategyName} not registered`);
        if (typeof strategy.collectTrade === 'function') {
            strategy.collectTrade(trade);
            console.log(`Collected trade for strategy "${strategyName}":`, trade);
        } else {
            console.warn(`Strategy "${strategyName}" does not implement collectTrade().`);
        }
    }

    /**
     * Processes signals for all registered strategies using the provided candle data.
     *
     * @param {Array} candles - An array of candle data.
     * @returns {Object} An object mapping strategy names to their calculated signals.
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
     * @param {string} strategyName - The name of the strategy.
     * @param {Array} candles - An array of candle data.
     * @returns {String} The calculated signal.
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
     * This is a simple example that can be extended to weighted or more complex consensus methods.
     *
     * @param {Array} candles - An array of candle data.
     * @param {string} method - "weighted" or "consensus" (stub implementation).
     * @returns {String} The consensus signal.
     */
    consensusSignal(candles, method = 'weighted') {
        const signals = this.processSignals(candles);
        // Simple consensus logic: if any strategy returns BUY, then BUY; if any returns SELL, then SELL; otherwise, HOLD.
        if (Object.values(signals).includes('BUY')) {
            return 'BUY';
        }
        if (Object.values(signals).includes('SELL')) {
            return 'SELL';
        }
        return 'HOLD';
    }

    /**
     * Executes a strategy given risk parameters and collected trades.
     * This is a stub; you'll need to implement risk management and trade execution logic.
     *
     * @param {string} strategyName - The name of the strategy.
     * @param {object} riskParams - Risk parameters.
     * @param {Array} trades - Collected trades.
     * @returns {any} The result of the execution.
     */
    executeStrategy(strategyName, riskParams, trades) {
        const strategy = this.strategies.get(strategyName);
        if (!strategy) {
            throw new Error(`Strategy ${strategyName} not registered`);
        }
        if (typeof strategy.execute === 'function') {
            return strategy.execute(riskParams, trades);
        } else {
            console.warn(`Strategy ${strategyName} does not implement execute() method.`);
            return null;
        }
    }
}

module.exports = StrategyManager;
