const mongoose = require('mongoose');

const IndicatorSettingsSchema = new mongoose.Schema({
    key: { type: String, default: 'default', unique: true },
    RSI: {
        period: { type: Number, default: 14 },
        overbought: { type: Number, default: 70 },
        oversold: { type: Number, default: 30 }
    },
    MACD: {
        shortPeriod: { type: Number, default: 12 },
        longPeriod: { type: Number, default: 26 },
        signalPeriod: { type: Number, default: 9 }
    },
    Bollinger_Bands: {
        period: { type: Number, default: 20 },
        stdDevMultiplier: { type: Number, default: 2 }
    },
    Donchian: {
        period: { type: Number, default: 20 },
        offset: { type: Number, default: 0 }
    },
    SmoothedHeikinAshi: {
        emaPeriod1: { type: Number, default: 55 },
        emaPeriod2: { type: Number, default: 100 }
    },
    SMA: {
        period: { type: Number, default: 14 }
    },
    ATR: {
        period: { type: Number, default: 14 }
    },
    Stochastic_RSI: {
        period: { type: Number, default: 14 },
        kPeriod: { type: Number, default: 3 },
        dPeriod: { type: Number, default: 3 }
    },
    MA_Crossover: {
        shortPeriod: { type: Number, default: 5 },
        longPeriod: { type: Number, default: 20 }
    }
}, { timestamps: true });

module.exports = mongoose.model('IndicatorSettings', IndicatorSettingsSchema);
