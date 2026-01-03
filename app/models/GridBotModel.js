const mongoose = require('mongoose');
const { Schema } = mongoose;
const BotBase = require('./BotBase');

/**
 * GridBotModel Schema
 * Stores configuration and state for Grid Trading bots (Spot & Futures).
 */
const GridBotSchema = new Schema({
    // --- Exchange & Status ---
    exchange: {
        type: String,
        required: true,
        enum: ['binance', 'okx', 'bingx']
    },
    status: {
        type: String,
        required: true,
        enum: ['RUNNING', 'PAUSED', 'STOPPED', 'ERROR', 'INITIALIZING'],
        default: 'INITIALIZING'
    },

    // --- Grid Strategy Configuration ---
    lowerPrice: { type: Number, required: true },
    upperPrice: { type: Number, required: true },
    grids:      { type: Number, required: true, min: 2 },
    gridMode:   {
        type: String,
        required: true,
        enum: ['ARITHMETIC', 'GEOMETRIC'],
        default: 'ARITHMETIC'
    },

    // Financials
    investment: { type: Number, required: true },
    // Added to match payload 'baseFund' (snapshot of wallet balance at creation)
    baseFund:   { type: Number, default: 0 },

    // --- Advanced Trigger & Trailing (Previously Skipped) ---
    triggerPrice: {
        type: Number,
        default: null
    },
    trailingUp: {
        type: Boolean,
        default: false
    },

    // --- Futures-Specific Configuration ---
    direction: {
        type: String,
        enum: ['NEUTRAL', 'LONG', 'SHORT'],
        default: 'NEUTRAL',
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
        default: false
    },

    // --- State and PnL Tracking ---
    currentProfit: { type: Number, default: 0 },
    positionContracts: { type: Number, default: 0 }, // Net position size

    // --- Risk Management ---
    stopLossPrice:   { type: Number },
    takeProfitPrice: { type: Number },

    // 'sellBaseOnStop' from frontend maps to this
    flattenOnExit:   { type: Boolean, default: true }

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Compound index for efficient user bot lookups
GridBotSchema.index({ userId: 1, status: 1 });

const GridBotModel = BotBase.discriminator('grid', GridBotSchema);

module.exports = GridBotModel;
