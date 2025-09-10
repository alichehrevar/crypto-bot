const mongoose = require('mongoose');

const recentLaunchSchema = new mongoose.Schema({
    asset: {
        type: String,
        required: true,
    },
    coingeckoId: {
        type: String,
        required: true,
        unique: true,
    },
    launchDate: {
        type: Date,
        required: true,
    },
    launchPrice: {
        type: Number,
        required: true,
    },
    currentPrice: {
        type: Number,
        default: 0,
    },
    velocity: {
        type: String,
        required: true,
        enum: ['Low', 'Medium', 'High', 'Very High'],
    },
}, { timestamps: true });

module.exports = mongoose.model('RecentLaunch', recentLaunchSchema);
