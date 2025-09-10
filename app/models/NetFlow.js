const mongoose = require('mongoose');

const netFlowSchema = new mongoose.Schema({
    // A unique identifier for the crypto asset, e.g., 'bitcoin'
    coinId: {
        type: String,
        required: true,
        index: true,
    },
    // The specific date for this data entry
    date: {
        type: Date,
        required: true,
    },
    // The formatted day string for easy frontend display, e.g., "Sep 10"
    day: {
        type: String,
        required: true,
    },
    inflow: {
        type: Number,
        required: true,
    },
    outflow: {
        type: Number,
        required: true,
    },
    totalNetFlow: {
        type: Number,
        required: true,
    },
    stablecoinFlow: {
        type: Number,
        required: true,
    },
    exchangeFlow: {
        type: Number,
        required: true,
    },
    txCount: {
        type: Number,
        required: true,
    },
    sevenDayMA: {
        type: Number,
        default: null, // Will be null for the first few days
    },
}, {
    timestamps: true // Adds createdAt and updatedAt fields
});

// Create a compound index to ensure we don't store duplicate data for the same coin on the same day.
netFlowSchema.index({ coinId: 1, date: 1 }, { unique: true });

const NetFlow = mongoose.model('NetFlow', netFlowSchema);

module.exports = NetFlow;
