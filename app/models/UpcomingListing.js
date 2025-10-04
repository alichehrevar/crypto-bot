const mongoose = require('mongoose');
const { Schema } = mongoose;

// Sub-schema for coins within an event
const coinSchema = new Schema({
    coinId: { type: String, required: true },
    name: { type: String, required: true },
    rank: { type: Number, required: true },
    symbol: { type: String, required: true },
    fullname: { type: String, required: true },
}, { _id: false });

// Sub-schema for categories
const categorySchema = new Schema({
    categoryId: { type: Number, required: true },
    name: { type: String, required: true },
}, { _id: false });

// Main schema for the crypto event
const upcomingListingSchema = new Schema({
    eventId: { type: Number, required: true, unique: true, index: true },
    title: { type: String, required: true },
    coins: [coinSchema],
    date_event: { type: Date, required: true },
    can_occur_before: { type: Boolean, default: false },
    created_date: { type: Date, required: true },
    displayed_date: { type: String },
    categories: [categorySchema],
    proof: { type: String },
    source: { type: String, required: true },

    launchPrice: {
        type: Number,
        default: 0, // Default to 0 if data isn't available
    },
    currentPrice: {
        type: Number,
        default: 0,
    },
    velocity: {
        type: String,
        default: 'N/A', // Default status
    },

}, { timestamps: true });

// MODIFIED: Export name changed to match your import
module.exports = mongoose.model('UpcomingListing', upcomingListingSchema);
