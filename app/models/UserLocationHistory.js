const mongoose = require('mongoose');

const userLocationHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
            required: true
        },
        coordinates: {
            type: [Number], // [Longitude, Latitude]
            required: true
        }
    },
    source: {
        type: String,
        default: 'tracking'
    },
    deviceInfo: {
        ip: String,
        userAgent: String,
        deviceId: String,
        city: { type: String, default: null },
        country: { type: String, default: null }
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Indexes for fast retrieval
userLocationHistorySchema.index({ userId: 1, timestamp: -1 });
userLocationHistorySchema.index({ location: '2dsphere' });

module.exports = mongoose.model('UserLocationHistory', userLocationHistorySchema);
