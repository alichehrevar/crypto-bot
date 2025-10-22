const mongoose = require('mongoose');
const { Schema } = mongoose;

const DcaBotSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
        type: String,
        enum: ["RUNNING", "TERMINATED", "FENCED", "ERROR", "DISABLED"],
        default: "DISABLED"
    },
    marketType: { type: String, enum: ['SPOT', 'FUTURES'], required: true },
    direction: { type: String, enum: ['LONG', 'SHORT', 'NEUTRAL'], required: true },
    activeDirection: { type: String, enum: ['LONG', 'SHORT', null], default: null },
    leverage: { type: Number, default: 1 },
    baseOrderVolume: { type: Number, required: true }, // base order size
    safetyOrderVolume: { type: Number, required: true }, // dca order size
    maxSafetyOrders: { type: Number, required: true }, // max dca orders
    priceDeviation: { type: Number, required: true }, // As a percentage
    volumeScale: { type: Number, default: 1 }, // DCA order size multiplier
    stepScale: { type: Number, default: 1 }, // Price deviation multiplier
    takeProfit: { type: Number, required: true }, // As a percentage
    stopLoss: { type: Number }, // As a percentage
    triggerPrice: { type: Number },
    neutralEntryDeviation: { type: Number }, // For NEUTRAL strategy
    useMarketForEntry: { type: Boolean, default: false },
    activeDeal: { type: Boolean, default: false },

    // --- Exit config (add these) ---
    enableTakeProfit: { type: Boolean, default: true },
    enableStopLoss: { type: Boolean, default: false },

    // Percent targets, expressed as e.g. 1.2 = +1.2%; -0.8 = -0.8%
    // Always interpreted relative to AEP (Average Entry Price)
    takeProfitPercent: { type: Number, default: 1.0 }, // +1.0% over AEP for LONG; -1.0% under AEP for SHORT
    stopLossPercent:   { type: Number, default: 3.0 }, // -3.0% under AEP for LONG; +3.0% over AEP for SHORT

    // Whether TP should "track" AEP after every DCA fill (cancel/replace TP)
    trackTpWithAep: { type: Boolean, default: true },

    lowerPrice: {
        type: Number,
    },
    upperPrice: {
        type: Number,
    },

    // Metrics
    averageEntryPrice: { type: Number, default: 0 },
    totalVolume: { type: Number, default: 0 },
    positionContracts: { type: Number, default: 0 }, // For futures
    completedDeals: { type: Number, default: 0 },
    terminateOnStopLoss: { type: Boolean, default: false },
    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Link to the base bot model if you have one
const BotBase = require('./BotBase');
const DcaBot = BotBase.discriminator('dca', DcaBotSchema);

module.exports = DcaBot;
