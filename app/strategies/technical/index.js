// strategies/technical/index.js

const RSI = require('./RSI');
const MACD = require('./MACD');
const MACrossover = require('./MovingAverageCrossover');
const Donchian = require('./Donchian');
const Volume = require('./Volume');
const HeikinAshi = require('./HeikinAshi');
const SmoothedHeikinAshi = require('./SmoothedHeikinAshi');
const SMA = require('./SMA');
const CombinedRsiMacd = require('./CombinedRsiMacd');
const BollingerBands = require('./BollingerBands');
const StochasticRSI = require('./StochasticRSI');
const N8NBotRunner = require('./N8NBotRunner');

module.exports = {
    RSI,
    MACD,
    MACrossover,
    Donchian,
    Volume,
    HeikinAshi,
    SmoothedHeikinAshi,
    SMA,
    CombinedRsiMacd,
    BollingerBands,
    StochasticRSI,
    N8NBotRunner,
};
