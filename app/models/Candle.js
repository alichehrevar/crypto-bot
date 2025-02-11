const mongoose = require('mongoose');

const candleSchema = new mongoose.Schema({
    symbol: {
        type: String,
        required: true,
        index: true
    },
    open: {
        type: Number,
        required: true
    },
    high: {
        type: Number,
        required: true
    },
    low: {
        type: Number,
        required: true
    },
    close: {
        type: Number,
        required: true
    },
    volume: {
        type: Number,
        required: true
    },
    timeframe: {
        type: String,
        enum: ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'],
        required: true
    },
    timestamp: {
        type: Date,
        required: true,
        index: true
    }
}, {
    timestamps: true
});

// Create a compound index to prevent duplicate entries for the same symbol, timeframe, and timestamp.
candleSchema.index({ symbol: 1, timeframe: 1, timestamp: 1 }, { unique: true });

module.exports = mongoose.model('Candle', candleSchema);
