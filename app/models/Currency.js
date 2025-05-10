// models/Currency.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const CurrencySchema = new Schema({
    symbol:      { type: String, unique: true, required: true }, // “BTC/USDT”
    baseAsset:   { type: String, required: true },                // “BTC”
    quoteAsset:  { type: String, required: true },                // “USDT”
    precision:   { type: Number, default: 8 },                    // common decimal precision
    lotSize:     {                                                     // minimum / step sizes
        min:  { type: Number },
        step: { type: Number }
    },
    priceFilter: {                                                   // price filters
        min:  { type: Number },
        tick: { type: Number }
    },
    minNotional: { type: Number },                                   // min cost
    exchange:    { type: String, default: 'binance' },               // so you know where it came from
    active:      { type: Boolean, default: true },
    imageUrl:    { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Currency', CurrencySchema);
