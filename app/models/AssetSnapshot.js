const mongoose = require('mongoose');

const AssetSnapshotSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    balances: {
        binance: { type: Number, default: 0 },
        okx:     { type: Number, default: 0 },
        bingx:   { type: Number, default: 0 }
    },
    total: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model('AssetSnapshot', AssetSnapshotSchema);
