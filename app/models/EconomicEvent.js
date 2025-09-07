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
    event: {
        type: String,
        required: true,
        trim: true,
    },
    impact: {
        type: String,
        required: true,
        enum: ['High', 'Medium', 'Low'], // Enforces data integrity
    },
    forecast: {
        type: String,
        default: 'N/A',
    },
    actual: {
        type: String,
        default: 'TBD',
    },
    source: {
        type: String,
        default: 'Internal' // Default value for manually added events
    }
}, {
    timestamps: true, // Adds createdAt and updatedAt timestamps
    toJSON: { virtuals: true }, // Ensure virtuals are included in JSON output
    toObject: { virtuals: true }
});

// Create a compound index to prevent duplicate events
economicEventSchema.index({ date: 1, event: 1 }, { unique: true });

const EconomicEvent = mongoose.model('EconomicEvent', economicEventSchema);

module.exports = EconomicEvent;
