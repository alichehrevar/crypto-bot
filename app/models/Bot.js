const mongoose = require('mongoose');

const botSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    symbol: {
        type: String,
        required: true,
        match: [/^[A-Z]+\/[A-Z]+$/, 'Use format: BASE/QUOTE (e.g. BTC/USDT)']
    },
    timeframe: {
        type: String,
        enum: ['1m','5m','15m','30m','1h','4h','1d','1w'],
        required: true
    },
    strategy: {
        type: String,
        enum: ['MA_Crossover', 'RSI', 'MACD'],
        required: true
    },
    strategyParams: mongoose.Schema.Types.Mixed,
    riskParams: {
        maxDrawdown: Number,
        dailyLossLimit: Number,
        positionSizeType: { type: String, enum: ['percentage', 'fixed'] },
        positionSizeValue: Number,
        maxOpenTrades: Number
    },
    active: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Bot', botSchema);
