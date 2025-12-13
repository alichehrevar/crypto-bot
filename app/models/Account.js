const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Generic Account Schema.
 * Specific exchange accounts (BinanceAccount, etc.) can inherit from this
 * or you can use this for generic/n8n accounts.
 */
const accountSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    exchange: {
        type: String,
        required: true,
        enum: ['binance', 'okx', 'bingx', 'n8n', 'paper']
    },
    // Generic credentials fields (optional, as some auths are different)
    apiKey: { type: String },
    apiSecret: { type: String },
    passphrase: { type: String },

    // Status
    active: { type: Boolean, default: true },
    isSimulation: { type: Boolean, default: false }
}, {
    timestamps: true,
    discriminatorKey: 'kind' // Allows inheritance if you want to unify models later
});

module.exports = mongoose.model('Account', accountSchema);
