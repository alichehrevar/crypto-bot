const mongoose = require('mongoose');

const upcomingListingSchema = new mongoose.Schema({
    asset: {
        type: String,
        required: true,
    },
    // A unique identifier, e.g., 'zksync-tge-multiple'
    eventId: {
        type: String,
        required: true,
        unique: true,
    },
    date: {
        type: Date,
        required: true,
    },
    type: {
        type: String,
        required: true,
        enum: ['Token Generation Event (TGE)', 'Listing', 'Airdrop Claim Opens'],
    },
    exchange: {
        type: String,
        required: true,
    },
}, { timestamps: true });

module.exports = mongoose.model('UpcomingListing', upcomingListingSchema);
