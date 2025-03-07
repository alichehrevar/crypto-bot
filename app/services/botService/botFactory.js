// botFactory.js

// ----- Indicators (Technical Strategies) -----
// Import all technical from the technical index file.
const {
    RSI,
    MACD,
    MACrossover,
    Donchian,
    Volume,
    HeikinAshi,
    CombinedRsiMacd,
    BollingerBands,
    StochasticRSI,
    Hurst
} = require('../../strategies/technical');

// ----- Risk (Money Management) Strategies -----
// Import risk management strategies from the moneyManagement directory.
const MartingaleStrategy = require('../../strategies/moneyManagement/MartingaleStrategy');
const MirroredMartingaleStrategy = require('../../strategies/moneyManagement/MirroredMartingaleStrategy');
const KellyCriterionStrategy = require('../../strategies/moneyManagement/KellyCriterionStrategy');
const SimpleStrategy = require('../../strategies/moneyManagement/SimpleStrategy');

// ----- Non-Technical Strategies -----
// For non-technical (e.g. fundamental or sentiment-based) strategies,
// you might create and import them from another directory.
const FundamentalStrategy = require('../../strategies/nonTechnical/FundamentalStrategy');

/**
 * Creates an indicator instance for technical bots.
 * This function selects and instantiates the proper indicator (RSI, MACD, etc.)
 * based on the bot.indicator field.
 *
 * @param {Object} bot - The bot document.
 * @returns {Object} An object (or instance) implementing calculateSignal().
 */
function createTechnicalIndicator(bot) {
    switch (bot.indicator) {
        case 'RSI':
            return new RSI(bot.strategyParams);
        case 'MACD':
            return new MACD(bot.strategyParams);
        case 'MA_Crossover':
            return new MACrossover(bot.strategyParams);
        case 'Donchian':
            return {
                calculateSignal: (candles) => Donchian.calculateDonchianSignal(candles, 'donchian')
            };
        case 'Volume':
            return {
                calculateSignal: (candles) => Volume.calculateVolumeSignal(candles, 'volume')
            };
        case 'Heikin_Ashi':
            return {
                calculateSignal: (candles) => HeikinAshi.calculateHeikinAshiSignal(candles, 'heikinashi')
            };
        case 'Combined_RSI_MACD':
            return {
                calculateSignal: (candles) =>
                    CombinedRsiMacd.calculateCombinedRsiMacdSignal(candles, 'combined', { parameters: { confirmation_window: 6 } })
            };
        case 'Bollinger_Bands':
            return {
                calculateSignal: (candles) => BollingerBands.calculateBollingerBandsSignal(candles, 'bollinger')
            };
        case 'Stochastic_RSI':
            return new StochasticRSI(bot.strategyParams);
        case 'Hurst':
            return new Hurst(bot.strategyParams);
        default:
            throw new Error(`Unknown indicator: ${bot.indicator}`);
    }
}

/**
 * Creates a risk (money-management) strategy instance.
 *
 * @param {Object} bot - The bot document.
 * @returns {Object} An instance implementing risk management functions.
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
            return new SimpleStrategy(bot.riskParams);
        default:
            throw new Error(`Unknown risk strategy: ${bot.riskStrategy}`);
    }
}

/**
 * Creates a strategy instance based on the bot's strategy type.
 * If the bot is technical (default), it uses technical technical.
 * If the bot is non-technical, it creates a non-technical strategy.
 *
 * @param {Object} bot - The bot document.
 * @returns {Object} An instance implementing calculateSignal().
 */
function createStrategy(bot) {
    // Default to "technical" if strategyType is not provided.
    if (!bot.strategyType || bot.strategyType === 'technical') {
        return createTechnicalIndicator(bot);
    } else if (bot.strategyType === 'nonTechnical') {
        return new FundamentalStrategy(bot.strategyParams);
    } else {
        throw new Error(`Unknown strategy type: ${bot.strategyType}`);
    }
}

module.exports = {
    createIndicator: createStrategy,
    createRiskStrategy,
};
