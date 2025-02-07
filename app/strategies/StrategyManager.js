class StrategyManager {
    constructor() {
        // Stores all available strategies.
        this.strategies = {};
    }

    // Register a strategy, associating it with a bot (or symbol/timeframe)
    registerStrategy(strategyName, strategyInstance) {
        this.strategies[strategyName] = strategyInstance;
    }

    // Process signals for all strategies
    processSignals(candles) {
        const signals = {};

        // For each strategy, calculate the signal
        for (let strategyName in this.strategies) {
            const strategy = this.strategies[strategyName];
            const signal = strategy.calculateSignal(candles); // This will run the calculateSignal() method for each strategy
            signals[strategyName] = signal;
        }

        return signals;
    }

    // Process signals for a specific strategy
    processSignalForStrategy(strategyName, candles) {
        const strategy = this.strategies[strategyName];
        if (!strategy) {
            throw new Error(`Strategy ${strategyName} not registered`);
        }

        return strategy.calculateSignal(candles);
    }
}

module.exports = StrategyManager;
