const mongoose = require('mongoose');

const sparklineDataSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
    },
    mentions: {
        type: Number,
        required: true,
    },
}, { _id: false });

const trendingTopicSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    sentiment: {
        type: String,
        enum: ['Positive', 'Negative', 'Neutral'],
        required: true,
    },
    linkedAssets: {
        type: [String],
        default: [],
    },
    socialMedia: {
        type: String,
        required: true,
    },
    // We'll store the raw mention counts for the last 30 days.
    // This will be used to dynamically calculate the sparkline, z-score, and 24h change.
    dailyMentions: {
        type: [sparklineDataSchema],
        default: [],
    },
}, {
    timestamps: true, // Adds createdAt and updatedAt timestamps
});

const TrendingTopic = mongoose.model('TrendingTopic', trendingTopicSchema);

module.exports = TrendingTopic;
