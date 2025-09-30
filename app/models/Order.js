const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Order Schema
 * Tracks every individual limit order placed by a grid bot.
 * This is essential for state management, reconciliation, and PnL calculation.
 */
const OrderSchema = new Schema({
    botId: {
        type: Schema.Types.ObjectId,
        ref: 'GridBot',
        required: true,
        index: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    // --- Exchange Identifiers ---
    clientOrderId: { // Our unique ID sent to the exchange
        type: String,
        required: true,
        unique: true,
        index: true
    },
    exchangeOrderId: { // The exchange's ID for the order
        type: String,
        index: true
    },
    // --- Order Details ---
    symbol: {
        type: String,
        required: true
    },
    side: {
        type: String,
        required: true,
        enum: ['BUY', 'SELL']
    },
    price: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: [
            'OPEN',             // Actively on the order book
            'PARTIALLY_FILLED',
            'FILLED',
            'CANCELED',
            'PENDING_PLACEMENT',// Our internal state before confirmation from exchange
            'PENDING_CANCEL',
            'FAILED_PLACEMENT'
        ],
        default: 'PENDING_PLACEMENT'
    },
    // --- Futures-Specific Flag ---
    // Critical for ensuring closing orders don't accidentally open new positions.
    reduceOnly: {
        type: Boolean,
        default: false
    },
    // --- Grid Line Reference ---
    // Helps identify which grid line this order belongs to for pairing logic.
    lineIndex: {
        type: Number,
        required: true
    },
    filledQuantity: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Index for quickly finding open orders for a bot during reconciliation
OrderSchema.index({ botId: 1, status: 1 });

const Order = mongoose.model('Order', OrderSchema);

module.exports = Order;
