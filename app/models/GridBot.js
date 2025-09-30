const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * GridBotModel Schema
 * This model stores the configuration and state for a single grid trading bot.
 * It's designed to be versatile for both SPOT and FUTURES markets.
 */
const GridBotSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    exchange: {
        type: String,
        required: true,
        enum: ['binance', 'okx', 'bingx'] // Add other supported exchanges
    },
    symbol: {
        type: String,
        required: true,
        uppercase: true,
        trim: true
    },
    status: {
        type: String,
        required: true,
        enum: ['RUNNING', 'PAUSED', 'STOPPED', 'ERROR', 'INITIALIZING'],
        default: 'INITIALIZING'
    },
    marketType: {
        type: String,
        required: true,
        enum: ['SPOT', 'FUTURES'],
    },
    // --- Grid Strategy Configuration ---
    lowerPrice: {
        type: Number,
        required: true
    },
    upperPrice: {
        type: Number,
        required: true
    },
    grids: {
        type: Number,
        required: true,
        min: 2
    },
    gridMode: {
        type: String,
        required: true,
        enum: ['ARITHMETIC', 'GEOMETRIC'],
        default: 'ARITHMETIC'
    },
    investment: {
        type: Number,
        required: true
    },
    // --- Futures-Specific Configuration ---
    direction: {
        type: String,
        enum: ['NEUTRAL', 'LONG', 'SHORT'],
        default: 'NEUTRAL',
        // Required only if marketType is FUTURES
        required: function() { return this.marketType === 'FUTURES'; }
    },
    leverage: {
        type: Number,
        default: 1,
        required: function() { return this.marketType === 'FUTURES'; }
    },
    marginMode: {
        type: String,
        enum: ['ISOLATED', 'CROSSED'],
        default: 'ISOLATED',
        required: function() { return this.marketType === 'FUTURES'; }
    },
    openOnCreation: {
        type: Boolean,
        default: false // For LONG/SHORT futures modes
    },
    // --- State and PnL Tracking ---
    currentProfit: {
        type: Number,
        default: 0
    },
    // Tracks net open position size. Positive for Long, Negative for Short.
    // Crucial for futures position management and ReduceOnly order sizing.
    positionContracts: {
        type: Number,
        default: 0
    },
    // --- Risk Management ---
    stopLossPrice: {
        type: Number,
        required: false
    },
    takeProfitPrice: {
        type: Number,
        required: false
    },
    flattenOnExit: {
        type: Boolean,
        default: true // If true, closes position when bot stops.
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Create a compound index for efficient querying of user's active bots
GridBotSchema.index({ userId: 1, status: 1 });

const GridBotModel = mongoose.model('GridBot', GridBotSchema);

module.exports = GridBotModel;
