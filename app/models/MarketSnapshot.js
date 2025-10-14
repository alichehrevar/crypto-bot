const mongoose = require('mongoose');
const { Schema } = mongoose;

const MarketSnapshotSchema = new Schema({
    // The trading symbol (e.g., 'BTC', 'ETH').
    symbol: {
        type: String,
        required: true,
        uppercase: true,
        index: true
    },
    // The name of the broker where the data originated.
    name: {
        type: String,
        required: true,
        enum: ['Binance', 'OKX', 'BingX'],
        index: true
    },
    // The market category: Spot or Perpetual Futures.
    category: {
        type: String,
        required: true,
        enum: ['Spot', 'Perpetual'],
        index: true
    },
    // The rank is calculated across all individual listings based on volume.
    rank: {
        type: Number,
        index: true
    },
    price: { type: Number, required: true },
    volume24h: { type: Number, required: true },
    change24h: { type: Number, required: true },
    last_updated: { type: Date, default: Date.now }
}, {
    timestamps: true // Adds createdAt and updatedAt
});

// A compound unique index to ensure only one entry per symbol-broker-category pair.
// This is the critical line that fixes the duplicate key error.
MarketSnapshotSchema.index({ symbol: 1, name: 1, category: 1 }, { unique: true });

module.exports = mongoose.model('MarketSnapshot', MarketSnapshotSchema);

