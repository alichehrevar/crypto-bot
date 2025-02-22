const RSI = require('../indicators/RSI');
const MACD = require('../indicators/MACD');
const MACrossover = require('../indicators/MovingAverageCrossover');
const MartingaleStrategy = require('../strategies/moneyManagement/MartingaleStrategy');
const MirroredMartingaleStrategy = require('../strategies/moneyManagement/MirroredMartingaleStrategy');
const KellyCriterionStrategy = require('../strategies/moneyManagement/KellyCriterionStrategy');
const SimpleStrategy = require('../strategies/moneyManagement/SimpleStrategy');

/**
 * Creates an indicator instance based on bot.indicator.
 * @param {Object} bot - The bot document.
 * @returns {Object} The indicator instance.
 */
function createIndicator(bot) {
    switch (bot.indicator) {
        case 'RSI':
            return new RSI(bot.strategyParams);
        case 'MACD':
            return new MACD(bot.strategyParams);
        case 'MA_Crossover':
            return new MACrossover(bot.strategyParams);
        default:
            throw new Error(`Unknown indicator: ${bot.indicator}`);
    }
}

/**
 * Creates a risk (money-management) strategy instance based on bot.riskStrategy.
 * @param {Object} bot - The bot document.
 * @returns {Object} The risk strategy instance.
 */
function createRiskStrategy(bot) {
    switch (bot.riskStrategy) {
        case 'MartingaleStrategy':
            return new MartingaleStrategy(bot.strategyParams);
        case 'MirroredMartingaleStrategy':
            return new MirroredMartingaleStrategy(bot.strategyParams);
        case 'KellyCriterionStrategy':
            return new KellyCriterionStrategy(bot.strategyParams);
        case 'SimpleStrategy':
            return new SimpleStrategy(bot.strategyParams);
        default:
            throw new Error(`Unknown risk strategy: ${bot.riskStrategy}`);
    }
}

module.exports = {
    createIndicator,
    createRiskStrategy,
};
