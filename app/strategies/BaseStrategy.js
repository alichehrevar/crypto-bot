class BaseStrategy {
    constructor(params) {
        if (new.target === BaseStrategy) {
            throw new Error("Cannot instantiate abstract class");
        }
        this.params = params;
    }

    calculateSignal(candles) {
        throw new Error("Method not implemented");
    }
}

module.exports = BaseStrategy;
