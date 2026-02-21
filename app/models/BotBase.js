// app/models/BotBase.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Base schema for all bots (Grid, DCA, Technical).
 * Stores only the fields common to every bot type.
 */
const baseBotSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    symbol: {
        type: String,
        required: true,
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    accountId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Account'
    },
    accountType: {
        type: String,
        required: true,
        enum: ['binance', 'okx', 'bingx', 'n8n', 'paper']
    },
    marketType: {
        type: String,
        enum: ['SPOT', 'FUTURES'],
        required: true
    },
    botType: {
        type: String,
        required: true,
        // 'technical' corresponds to the new model
        enum: ['grid', 'dca', 'technical']
    },
    // Moved up from TechnicalBotModel to ensure Grid/DCA bots don't crash the BotService key generation
    timeframe: {
        type: String,
        enum: ['1m','5m','15m','30m','1h','4h','1d','1w'],
        default: '1m'
    },
    active: {
        type: Boolean,
        default: false
    },
    mode: {
        type: String,
        enum: ['live', 'paper'],
        default: 'paper'
    },
    paperBalance: {
        type: Number,
        default: 10000
    },
    cumulativePnL: {
        type: Number,
        default: 0
    }
}, {
    discriminatorKey: 'botType',
    timestamps: true
});

// Common indexes
baseBotSchema.index({ symbol: 1 });
baseBotSchema.index({ userId: 1, active: 1 });

module.exports = mongoose.model('BotBase', baseBotSchema);
