const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
    bot: { type: mongoose.Schema.Types.ObjectId, ref: 'Bot' },
    symbol: String,
    type: { type: String, enum: ['BUY', 'SELL'] },
    entryPrice: Number,
    exitPrice: Number,
    quantity: Number,
    profit: Number,
    duration: Number,
    timestamp: Date
});

module.exports = mongoose.model('Trade', tradeSchema);
