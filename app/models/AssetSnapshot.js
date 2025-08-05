/**
 * @file Defines the Mongoose schema for daily asset balance snapshots.
 */
const mongoose = require('mongoose');

/**
 * @description Schema for storing a daily snapshot of a user's total asset balance,
 * broken down by exchange.
 */
const AssetSnapshotSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true, // Index for faster lookups by user
    },
    /**
     * @description The specific date for the snapshot. The time part should be ignored or set to midnight.
     */
    timestamp: {
        type: Date,
        required: true, // Enforce explicit setting of the timestamp
    },
    /**
     * @description An object holding the total balance from each exchange at the time of the snapshot.
     */
    balances: {
        binance: { type: Number, default: 0 },
        okx:     { type: Number, default: 0 },
        bingx:   { type: Number, default: 0 }
    },
    /**
     * @description The total combined balance across all exchanges.
     */
    total: {
        type: Number,
        default: 0
    }
});

// Create a unique compound index to ensure only one snapshot per user per day.
AssetSnapshotSchema.index({ userId: 1, timestamp: 1 }, { unique: true });

module.exports = mongoose.model('AssetSnapshot', AssetSnapshotSchema);
