const mongoose = require('mongoose');
// Import our dedicated log database connection
const logDbConnection = require('../../config/logDb');

/**
 * BotLog Schema
 * Stores "Hot" logs for the Frontend Dashboard.
 * * STRATEGY:
 * We use a standard collection with a TTL (Time-To-Live) index.
 * Logs are automatically deleted after 3 days to keep the DB fast.
 * Long-term history is preserved in File Logs (handled by botLogger.js).
 */
const botLogSchema = new mongoose.Schema({
    timestamp: {
        type: Date,
        required: true,
    },
    level: {
        type: String,
        required: true,
        index: true, // Useful for filtering "Errors" in dashboard
    },
    message: {
        type: String,
        required: true,
    },
    meta: {
        type: mongoose.Schema.Types.Mixed, // Stores botId, orderId, price, etc.
    },
}, {
    collection: 'botlogs',
    timestamps: false, // We manage our own 'timestamp' field
    versionKey: false,
});

// --- Indexes ---

// 1. FAST LOOKUP: Compound index for fetching a specific bot's logs quickly
// (e.g. "Get me the last 100 logs for Bot X")
botLogSchema.index({ 'meta.botId': 1, timestamp: -1 });

// 2. AUTO-DELETE (TTL): Automatically remove logs older than 3 Days (259200 seconds)
// This keeps your MongoDB small and fast (The "Hot" Layer)
botLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 259200 });

// Export model using the dedicated log DB connection
module.exports = logDbConnection.model('BotLog', botLogSchema);
