// botFactory.js

// ----- Indicators -----
// Import all indicators from the indicators index file.
const {
    RSI,
    MACD,
    MACrossover,
    Donchian,
    Volume,
    HeikinAshi,
    CombinedRsiMacd,
    BollingerBands,
    // For Stochastic_RSI, we import the function directly.
    // (Assuming your file exports: { calculateStochasticRSISignal }.)
    calculateStochasticRSISignal,
    HurstIndicator,
} = require('../../indicators');

// ----- Strategies (Money Management) -----
// Import all risk management (money management) strategy modules.
const MartingaleStrategy = require('../../strategies/moneyManagement/MartingaleStrategy');
const MirroredMartingaleStrategy = require('../../strategies/moneyManagement/MirroredMartingaleStrategy');
const KellyCriterionStrategy = require('../../strategies/moneyManagement/KellyCriterionStrategy');
const SimpleStrategy = require('../../strategies/moneyManagement/SimpleStrategy');

/**
 * Creates an indicator instance based on the bot.indicator field.
 * @param {Object} bot - The bot document.
 * @returns {Object} An instance or object implementing calculateSignal().
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
                // Wrap the signal function for Donchian.
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
            // For Stochastic_RSI, use the calculateStochasticRSISignal function and return the last signal.
            return {
                calculateSignal: (candles) => {
                    const signals = calculateStochasticRSISignal(candles, 'stochrsi');
                    // Return the signal for the last candle, or 'HOLD' if signals array is empty.
                    return signals && signals.length ? signals[signals.length - 1] : 'HOLD';
                }
            };
        case 'Hurst':
            return new HurstIndicator(bot.strategyParams);
        default:
            throw new Error(`Unknown indicator: ${bot.indicator}`);
    }
}

/**
 * Creates a risk (money-management) strategy instance based on the bot.riskStrategy field.
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
            return new SimpleStrategy(bot.riskParams);
        default:
            throw new Error(`Unknown risk strategy: ${bot.riskStrategy}`);
    }
}

module.exports = {
    createIndicator,
    createRiskStrategy,
};
