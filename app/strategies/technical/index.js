// strategies/technical/index.js

const RSI = require('./RSI');
const MACD = require('./MACD');
const MACrossover = require('./MovingAverageCrossover');
const Donchian = require('./Donchian');
const Volume = require('./Volume');
const HeikinAshi = require('./HeikinAshi');
const CombinedRsiMacd = require('./CombinedRsiMacd');
const BollingerBands = require('./BollingerBands');
const StochasticRSI = require('./StochasticRSI');

module.exports = {
    RSI,
    MACD,
    MACrossover,
    Donchian,
    Volume,
    HeikinAshi,
    CombinedRsiMacd,
    BollingerBands,
    StochasticRSI,
};
