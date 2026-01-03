const mongoose = require('mongoose');
const { Schema } = mongoose;
const BotBase = require('./BotBase');

/**
 * DcaBotModel Schema
 * Stores configuration for Dollar Cost Averaging bots.
 */
const DcaBotSchema = new Schema({
    // --- Core Strategy Config (From Payload) ---

    // Form sends 'long'/'short', we uppercase it for consistency
    direction: {
        type: String,
        enum: ['LONG', 'SHORT', 'NEUTRAL'],
        required: true,
        set: (v) => v ? v.toUpperCase() : v
    },

    // Price deviation to open safety orders (%)
    priceDeviation: {
        type: Number,
        required: true
    },

    // Target profit (%)
    takeProfit: {
        type: Number,
        required: true
    },

    // Base order size (USDT)
    baseOrderVolume: {
        type: Number,
        required: true
    },

    // Safety order size (USDT)
    safetyOrderVolume: {
        type: Number,
        required: true
    },

    // Max number of safety orders
    maxSafetyOrders: {
        type: Number,
        required: true
    },

    // --- Advanced / Optional Config ---
    triggerPrice: { type: Number }, // Optional start price

    // Multipliers
    stepScale:   { type: Number, default: 1 }, // Scales price deviation
    volumeScale: { type: Number, default: 1 }, // Scales safety order volume

    // Range filters
    lowerPrice: { type: Number },
    upperPrice: { type: Number },

    // Stop Loss
    stopLoss: { type: Number },
    terminateOnStopLoss: { type: Boolean, default: false },

    // --- Internal State & Metrics ---
    status: {
        type: String,
        enum: ["RUNNING", "TERMINATED", "FENCED", "ERROR", "DISABLED"],
        default: "DISABLED"
    },

    // Used to track the current state of the DCA cycle
    activeDeal: { type: Boolean, default: false },
    activeDirection: { type: String, enum: ['LONG', 'SHORT', null], default: null },

    // Metrics for ROI calculation
    averageEntryPrice: { type: Number, default: 0 },
    totalVolume:       { type: Number, default: 0 }, // Total USDT currently invested
    completedDeals:    { type: Number, default: 0 },

    // Futures specific (Defaulted for now as form is Spot-focused)
    leverage: { type: Number, default: 1 },
    positionContracts: { type: Number, default: 0 }

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// PRE-SAVE HOOK: Enforce defaults for DCA
DcaBotSchema.pre('validate', function(next) {
    // 1. DCA is typically Spot in this context, so we auto-fill marketType
    //    to satisfy BotBase's 'required' check.
    if (!this.marketType) {
        this.marketType = 'SPOT';
    }

    // 2. Map frontend "Buy"/"Sell" tab logic if sent loosely
    if (this.direction) {
        if (this.direction === 'BUY') this.direction = 'LONG';
        if (this.direction === 'SELL') this.direction = 'SHORT';
    }

    next();
});

const DcaBotModel = BotBase.discriminator('dca', DcaBotSchema);

module.exports = DcaBotModel;
