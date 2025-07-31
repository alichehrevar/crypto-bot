const mongoose = require('mongoose');
const { Schema } = mongoose;

const CurrencySchema = new Schema({
    id:           { type: String, unique: true, required: true }, // CoinPaprika ID (e.g. btc-bitcoin)
    name:         { type: String },
    symbol:       { type: String },
    rank:         { type: Number },
    is_new:       { type: Boolean },
    is_active:    { type: Boolean },
    type:         { type: String }, // coin or token
    imageUrl:     { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Currency', CurrencySchema);
