const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Represents a specific bot configuration from your Excel file.
 *
 * This is the "implementation" of a single AlgorithmPrompt.
 * An AlgorithmPrompt can have MANY TradingBots (e.g., for different symbols).
 */
const tradingBotSchema = new mongoose.Schema({
    /**
     * Links this bot back to the specific prompt that defines its strategy.
     */
    promptId: {
        type: Schema.Types.ObjectId,
        ref: 'AlgorithmPrompt',
        required: true,
        index: true
    },
    /**
     * The 'ID' column from your CSV.
     */
    customBotId: {
        type: String,
        required: true,
        index: true
    },
    botName: {
        type: String,
        required: true
    },
    symbol: {
        type: String,
        required: true
    },
    exchange: {
        type: String,
        required: true
    },
    direction: {
        type: String,
        enum: ['Long', 'Short'],
        required: true
    },
    entryPrice: {
        type: Number,
        required: true
    },
    takeProfit1: {
        type: Number,
        required: true
    },
    takeProfit2: {
        type: Number,
        required: false
    },
    takeProfit3: {
        type: Number,
        required: false
    },
    stopLoss: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['Active', 'Closed', 'Pending', 'Error'], // From your sheet
        default: 'Pending'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('TradingBot', tradingBotSchema);
