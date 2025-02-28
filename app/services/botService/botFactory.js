// Indicators
const RSI = require('../../indicators/RSI');
const MACD = require('../../indicators/MACD');
const MACrossover = require('../../indicators/MovingAverageCrossover');
const Donchian = require('../../indicators/Donchian');
const Volume = require('../../indicators/Volume');
const HeikinAshi = require('../../indicators/HeikinAshi');
const CombinedRsiMacd = require('../../indicators/CombinedRsiMacd');
const BollingerBands = require('../../indicators/BollingerBands');
const StochasticRSI = require('../../indicators/StochasticRSI');

// Strategies
const MartingaleStrategy = require('../../strategies/moneyManagement/MartingaleStrategy');
const MirroredMartingaleStrategy = require('../../strategies/moneyManagement/MirroredMartingaleStrategy');
const KellyCriterionStrategy = require('../../strategies/moneyManagement/KellyCriterionStrategy');
const SimpleStrategy = require('../../strategies/moneyManagement/SimpleStrategy');

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
        case 'Donchian':
            return {
                // For Donchian, we simply expose the signal function; you might wrap it in an object if needed.
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
                calculateSignal: (candles) => CombinedRsiMacd.calculateCombinedRsiMacdSignal(candles, 'combined', { parameters: { confirmation_window: 6 } })
            };
        case 'Bollinger_Bands':
            return {
                calculateSignal: (candles) => BollingerBands.calculateBollingerBandsSignal(candles, 'bollinger')
            };
        case 'Stochastic_RSI':
            return new StochasticRSI(bot.strategyParams);  // assuming StochasticRSI is implemented similarly to others
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
