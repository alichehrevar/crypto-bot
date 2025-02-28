const BaseStrategy = require('./BaseIndicator');
const MACrossover = require('./MovingAverageCrossover');
const RSI = require('./RSI');
const MACD = require('./MACD');
const Donchian = require('./Donchian');
const Volume = require('./Volume');
const HeikinAshi = require('./HeikinAshi');
const CombinedRsiMacd = require('./CombinedRsiMacd');
const BollingerBands = require('./BollingerBands');
const StochasticRSI = require('./StochasticRSI');

module.exports = {
    BaseStrategy,
    MACrossover,
    RSI,
    MACD,
    Donchian,
    Volume,
    HeikinAshi,
    CombinedRsiMacd,
    BollingerBands,
    StochasticRSI
};
