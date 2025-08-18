// app/models/FavoriteSymbol.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const favoriteSymbolSchema = new Schema({
    /**
     * A reference to the user who favorited this symbol.
     * This creates a direct relationship with the User model.
     */
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User', // This must match the model name you used for your User schema
        required: true,
        index: true // Indexing this field improves query performance
    },
    /**
     * The full symbol identifier, e.g., "BTC/USDT".
     */
    symbol: {
        type: String,
        required: true
    },
    /**
     * The exchange where the symbol is traded, e.g., "Binance".
     */
    broker: {
        type: String,
        required: true
    },
    /**
     * The market category, e.g., "Spot" or "USDT-M".
     */
    category: {
        type: String,
        required: true
    },
    /**
     * The timestamp when the symbol was favorited.
     */
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Create a compound index to ensure a user can only favorite a specific symbol once.
favoriteSymbolSchema.index({ userId: 1, symbol: 1 }, { unique: true });

module.exports = mongoose.model('FavoriteSymbol', favoriteSymbolSchema);
