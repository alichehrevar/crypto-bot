const mongoose = require('mongoose');

const UpcomingListingSchema = new mongoose.Schema({
    asset: {
        type: String,
        required: true,
        unique: true, // Assuming each asset has one upcoming event
    },
    eventDate: {
        type: Date,
        required: true,
    },
    eventType: {
        type: String,
        required: true,
        enum: ['Token Generation Event (TGE)', 'Listing', 'Airdrop Claim Opens'],
    },
    exchange: {
        type: String,
        required: true,
    },
}, {
    timestamps: true // Adds createdAt and updatedAt
});

module.exports = mongoose.model('UpcomingListing', UpcomingListingSchema);
