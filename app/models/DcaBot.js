// app/models/DcaBot.js
const mongoose = require('mongoose');
const { Schema } = mongoose;
const BotBase = require('./BotBase');

/**
 * DcaBotModel Schema
 * Stores configuration for Dollar Cost Averaging bots.
 * Aligned with DcaConfigForm.tsx frontend payload.
 */
const DcaBotSchema = new Schema({
    // --- Core Strategy Config (Required from Form) ---

    // Direction: 'LONG' or 'SHORT' (Mapped from frontend 'buy'/'sell' tab)
    direction: {
        type: String,
        enum: ['LONG', 'SHORT', 'NEUTRAL'],
        required: true,
        set: (v) => v ? v.toUpperCase() : v
    },

    // Price deviation to open safety orders (%)
    // Frontend: priceDeviation
    priceDeviation: {
        type: Number,
        required: [true, 'Price deviation is required']
    },

    // Target profit (%)
    // Frontend: takeProfit
    takeProfit: {
        type: Number,
        required: [true, 'Take profit is required']
    },

    // Base order size (USDT)
    // Frontend: baseOrderVolume
    baseOrderVolume: {
        type: Number,
        required: [true, 'Base order volume is required']
    },

    // Safety order size (USDT)
    // Frontend: safetyOrderVolume
    safetyOrderVolume: {
        type: Number,
        required: [true, 'Safety order volume is required']
    },

    // Max number of safety orders
    // Frontend: maxSafetyOrders
    maxSafetyOrders: {
        type: Number,
        required: [true, 'Max safety orders count is required']
    },

    // --- Advanced / Optional Config (From Accordion) ---

    // Start price (Optional)
    triggerPrice: {
        type: Number,
        default: null
    },

    // Multipliers (Price deviation step scale)
    // Frontend: stepScale (Defaults to 1 if not provided)
    stepScale:   {
        type: Number,
        default: 1
    },

    // Multipliers (Volume scale)
    // Frontend: volumeScale (Defaults to 1 if not provided)
    volumeScale: {
        type: Number,
        default: 1
    },

    // Range filters (Optional)
    lowerPrice: { type: Number, default: null },
    upperPrice: { type: Number, default: null },

    // Stop Loss (Optional)
    stopLoss: { type: Number, default: null },

    // Frontend: terminateOnStopLoss (Checkbox)
    terminateOnStopLoss: {
        type: Boolean,
        default: false
    },

    // --- Internal State & Metrics ---
    status: {
        type: String,
        enum: ["RUNNING", "TERMINATED", "FENCED", "ERROR", "DISABLED"],
        default: "DISABLED" // Starts disabled until explicit start or logic trigger
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
    if (!this.marketType) {
        this.marketType = 'SPOT';
    }

    // 2. Ensure scales are never 0 or negative (safety check)
    if (this.stepScale <= 0) this.stepScale = 1;
    if (this.volumeScale <= 0) this.volumeScale = 1;

    next();
});

const DcaBotModel = BotBase.discriminator('dca', DcaBotSchema);

module.exports = DcaBotModel;
