const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Fill Schema
 * Records every individual trade execution from the exchange.
 * This is used for idempotency (preventing processing the same fill twice)
 * and for detailed PnL analysis.
 */
const FillSchema = new Schema({
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
    orderId: { // Our internal Order ID
        type: Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    // --- Exchange Identifiers ---
    exchangeTradeId: {
        type: String,
        required: true,
        index: true
    },
    exchangeOrderId: {
        type: String,
        required: true
    },
    // --- Fill Details ---
    symbol: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    fee: {
        type: Number,
        required: true
    },
    feeCurrency: {
        type: String,
        required: true
    },
    side: {
        type: String,
        required: true,
        enum: ['BUY', 'SELL']
    },
    timestamp: {
        type: Date,
        required: true
    }
}, {
    timestamps: true
});

// A unique compound index to ensure we never process the same trade twice.
FillSchema.index({ botId: 1, exchangeTradeId: 1 }, { unique: true });

const Fill = mongoose.model('Fill', FillSchema);

module.exports = Fill;
