const mongoose = require('mongoose');
// Import our dedicated log database connection
const logDbConnection = require('../../config/logDb');

/**
 * This schema is based on the structure that 'winston-mongodb' creates.
 * 'winston-mongodb' stores the main log info at the top level
 * and custom data (like botId) inside the 'meta' field.
 */
const botLogSchema = new mongoose.Schema({
    timestamp: {
        type: Date,
        required: true,
    },
    level: {
        type: String,
        required: true,
        index: true, // Index on level for filtering (e.g., find all 'error')
    },
    message: {
        type: String,
        required: true,
    },
    meta: {
        type: mongoose.Schema.Types.Mixed, // Store any extra data
    },
}, {
    // This collection name will be used by winston-mongodb
    collection: 'botlogs',
    // Capped collections are great for logs!
    // They are fixed-size and overwrite old entries,
    // preventing infinite disk usage.
    capped: {
        size: 1024 * 1024 * 500, // 500MB
        max: 5000000, // Max 5 million documents
    },
    timestamps: false, // We have our own 'timestamp'
    versionKey: false,
});

// --- Indexes ---
// Create a compound index on botId (in meta) and timestamp.
// This is CRITICAL for quickly fetching logs for a specific bot.
botLogSchema.index({ 'meta.botId': 1, timestamp: -1 });

// 'winston-mongodb' might create this automatically,
// but we define our model here for clarity and for querying.

// Register the model on the *log database connection*
module.exports = logDbConnection.model('BotLog', botLogSchema);

