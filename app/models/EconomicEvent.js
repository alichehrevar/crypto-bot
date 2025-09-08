const mongoose = require('mongoose');
const { Schema } = mongoose;

const economicEventSchema = new Schema({
    date: {
        type: Date,
        required: true,
    },
    time: {
        type: String, // e.g., "14:00 UTC"
        required: true,
    },
    event: { // This will be the 'title' from CoinGecko
        type: String,
        required: true,
        trim: true,
    },
    impact: {
        type: String,
        required: true,
        enum: ['High', 'Medium', 'Low', 'N/A'], // Added N/A for crypto events
    },
    forecast: {
        type: String,
        default: 'N/A',
    },
    actual: {
        type: String,
        default: 'TBD',
    },
    // ---- New fields for CoinGecko data ----
    description: {
        type: String,
        trim: true,
    },
    organizer: {
        type: String,
    },
    eventType: { // 'type' is a reserved keyword in Mongoose
        type: String,
    },
    source: {
        type: String,
        required: true,
        default: 'Internal' // 'Internal' for manual entries, 'CoinGecko' for API
    },
    // A unique identifier to prevent duplicates when fetching from CoinGecko
    sourceId: {
        type: String,
        sparse: true, // Allows nulls but enforces uniqueness for non-null values
        unique: true,
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Use sourceId for uniqueness for CoinGecko events, and a compound index for internal ones.
economicEventSchema.index({ date: 1, event: 1, source: 1 }, { unique: true });

const EconomicEvent = mongoose.model('EconomicEvent', economicEventSchema);

module.exports = EconomicEvent;
