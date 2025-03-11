// botFactory.js

// ----- Technical Indicators -----
// Import all technical indicators from the centralized index file.
// (Make sure that your technical index file exports all the necessary indicator classes.)
const {
    RSI,
    MACD,
    MACrossover,
    Donchian,
    Volume,
    HeikinAshi,
    CombinedRsiMacd,
    BollingerBands,
    StochasticRSI
} = require('../../strategies/technical');

// ----- Risk (Money Management) Strategies -----
// Import risk management strategies from the moneyManagement directory.
const MartingaleStrategy = require('../../strategies/moneyManagement/MartingaleStrategy');
const MirroredMartingaleStrategy = require('../../strategies/moneyManagement/MirroredMartingaleStrategy');
const KellyCriterionStrategy = require('../../strategies/moneyManagement/KellyCriterionStrategy');
const SimpleStrategy = require('../../strategies/moneyManagement/SimpleStrategy');

// ----- Non-Technical Strategies -----
// (Uncomment or add non-technical strategies if needed)
// const FundamentalStrategy = require('../../strategies/nonTechnical/FundamentalStrategy');

// ----- Dynamic Strategy Wrapper -----
// Import the dynamic wrapper to enable dynamic parameter updates.
const DynamicStrategy = require('../../strategies/DynamicStrategy');

/**
 * Creates an indicator instance for technical bots.
 * This function selects and instantiates the proper technical indicator (RSI, MACD, etc.)
 * based on the bot.indicator field.
 *
 * @param {Object} bot - The bot document.
 * @returns {Object} An instance implementing calculateSignal().
 */
function createTechnicalIndicator(bot) {
    let indicatorInstance;
    switch (bot.indicator) {
        case 'RSI':
            indicatorInstance = new RSI(bot.strategyParams);
            break;
        case 'MACD':
            indicatorInstance = new MACD(bot.strategyParams);
            break;
        case 'MA_Crossover':
            indicatorInstance = new MACrossover(bot.strategyParams);
            break;
        case 'Donchian':
            // For Donchian, we assume a static function is provided.
            indicatorInstance = {
                calculateSignal: (candles) => Donchian.calculateDonchianSignal(candles, 'donchian')
            };
            break;
        case 'Volume':
            indicatorInstance = {
                calculateSignal: (candles) => Volume.calculateVolumeSignal(candles, 'volume')
            };
            break;
        case 'Heikin_Ashi':
            indicatorInstance = {
                calculateSignal: (candles) => HeikinAshi.calculateHeikinAshiSignal(candles, 'heikinashi')
            };
            break;
        case 'Combined_RSI_MACD':
            indicatorInstance = {
                calculateSignal: (candles) =>
                    CombinedRsiMacd.calculateCombinedRsiMacdSignal(candles, 'combined', { parameters: { confirmation_window: 6 } })
            };
            break;
        case 'Bollinger_Bands':
            indicatorInstance = {
                calculateSignal: (candles) => BollingerBands.calculateBollingerBandsSignal(candles, 'bollinger')
            };
            break;
        case 'Stochastic_RSI':
            indicatorInstance = new StochasticRSI(bot.strategyParams);
            break;
        default:
            throw new Error(`Unknown indicator: ${bot.indicator}`);
    }
    return indicatorInstance;
}

/**
 * Creates a risk (money-management) strategy instance based on bot.riskStrategy.
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
            // Note: For simple strategy, we pass risk parameters instead of strategy parameters.
            return new SimpleStrategy(bot.riskParams);
        default:
            throw new Error(`Unknown risk strategy: ${bot.riskStrategy}`);
    }
}

/**
 * Creates a complete strategy instance for the bot.
 * For technical strategies, it creates an indicator instance.
 * If the bot is dynamic (i.e. dynamic reoptimization is desired),
 * the indicator is wrapped with the DynamicStrategy to allow periodic updates.
 *
 * @param {Object} bot - The bot document.
 * @returns {Object} An instance implementing calculateSignal().
 */
function createStrategy(bot) {
    // Create the technical indicator instance.
    let indicatorInstance = createTechnicalIndicator(bot);

    // If the bot is marked as dynamic, wrap the indicator in a DynamicStrategy.
    if (bot.dynamic) {
        return new DynamicStrategy(indicatorInstance, bot.strategyParams, bot.symbol, bot.timeframe);
    }
    return indicatorInstance;
}

module.exports = {
    // Export the createStrategy function as createIndicator for backward compatibility.
    createIndicator: createStrategy,
    createRiskStrategy,
};
