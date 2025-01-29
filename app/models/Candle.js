const mongoose = require('mongoose');

const candleSchema = new mongoose.Schema({
    symbol: {
        type: String,
        required: true,
        index: true
    },
    open: Number,
    high: Number,
    low: Number,
    close: Number,
    volume: Number,
    timeframe: {
        type: String,
        enum: ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'],
        required: true
    },
    timestamp: {
        type: Date,
        index: true
    }
}, {
    timestamps: true,
    // Compound index to prevent duplicate entries
    index: {
        unique: true,
        fields: ['symbol', 'timeframe', 'timestamp']
    }
});

module.exports = mongoose.model('Candle', candleSchema);
