// app/models/MarketSnapshot.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

// Sub-schema for the ROI data (can be null)
const roiSchema = new Schema({
    times: Number,
    currency: String,
    percentage: Number
}, { _id: false });

// Sub-schema for the quote data (USD, BTC, etc.)
const quoteSchema = new Schema({
    price: Number,
    high_24h: Number,
    low_24h: Number,
    price_change_24h: Number,
    market_cap: Number,
    market_cap_change_24h: Number,
    market_cap_change_percentage_24h: Number,
    fully_diluted_valuation: Number,
    total_volume: Number,
    percent_change_1h: Number,
    percent_change_24h: Number,
    percent_change_7d: Number
}, { _id: false });

const MarketSnapshotSchema = new Schema({
    id:                 { type: String, required: true, unique: true },
    name:               { type: String, required: true },
    symbol:             { type: String, required: true },
    rank:               { type: Number, index: true },
    type:               { type: String, enum: ['coin', 'token'] },
    circulating_supply: { type: Number },
    total_supply:       { type: Number },
    max_supply:         { type: Number },
    ath:                { type: Number }, // All-Time High price
    ath_change_percentage: { type: Number },
    ath_date:           { type: Date },
    atl:                { type: Number }, // All-Time Low price
    atl_change_percentage: { type: Number },
    first_data_at:      { type: Date }, // This field will hold `atl_date` from the API
    last_updated:       { type: Date },
    roi:                roiSchema, // ROI sub-document
    quotes: {
        USD: quoteSchema,
        BTC: quoteSchema
    },
    imageUrl:           { type: String },
}, {
    timestamps: true
});

module.exports = mongoose.model('MarketSnapshot', MarketSnapshotSchema);
