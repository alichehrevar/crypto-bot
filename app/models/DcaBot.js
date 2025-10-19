const mongoose = require('mongoose');
const { Schema } = mongoose;

const DcaBotSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    symbol: { type: String, required: true, index: true },
    exchange: { type: String, required: true },
    status: {
        type: String,
        enum: ["RUNNING", "TERMINATED", "FENCED", "ERROR", "DISABLED"],
        default: "DISABLED"
    },
    marketType: { type: String, enum: ['SPOT', 'FUTURES'], required: true },
    direction: { type: String, enum: ['LONG', 'SHORT', 'NEUTRAL'], required: true },
    activeDirection: { type: String, enum: ['LONG', 'SHORT', null], default: null },
    leverage: { type: Number, default: 1 },
    baseOrderVolume: { type: Number, required: true },
    safetyOrderVolume: { type: Number, required: true },
    maxSafetyOrders: { type: Number, required: true },
    priceDeviation: { type: Number, required: true }, // As a percentage
    volumeScale: { type: Number, default: 1 },
    stepScale: { type: Number, default: 1 },
    takeProfit: { type: Number, required: true }, // As a percentage
    stopLoss: { type: Number }, // As a percentage
    neutralEntryDeviation: { type: Number }, // For NEUTRAL strategy
    useMarketForEntry: { type: Boolean, default: false },
    activeDeal: { type: Boolean, default: false },
    // Metrics
    averageEntryPrice: { type: Number, default: 0 },
    totalVolume: { type: Number, default: 0 },
    positionContracts: { type: Number, default: 0 }, // For futures
    completedDeals: { type: Number, default: 0 },
    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Link to the base bot model if you have one
// This assumes you might have a BotBase model for common fields
const BotBase = require('./BotBase');
const DcaBot = BotBase.discriminator('DcaBot', DcaBotSchema);

module.exports = DcaBot;
