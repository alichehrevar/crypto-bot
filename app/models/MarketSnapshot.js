const mongoose = require('mongoose');
const { Schema } = mongoose;

const quoteSchema = new Schema({
    price: Number,
    volume_24h: Number,
    market_cap: Number,
    percent_change_1h: Number,
    percent_change_24h: Number,
    percent_change_7d: Number
}, { _id: false });

const MarketSnapshotSchema = new Schema({
    id:         { type: String, required: true, unique: true }, // coin ID (btc-bitcoin)
    name:       { type: String },
    symbol:     { type: String },
    rank:       { type: Number },
    type:       { type: String },
    circulating_supply: { type: Number },
    total_supply:       { type: Number },
    max_supply:         { type: Number },
    beta_value:         { type: Number },
    first_data_at:      { type: Date },
    last_updated:       { type: Date },
    quotes: {
        USD: quoteSchema,
        BTC: quoteSchema
    },
    imageUrl:   { type: String },
    updatedAt:  { type: Date, default: Date.now }
});

module.exports = mongoose.model('MarketSnapshot', MarketSnapshotSchema);
