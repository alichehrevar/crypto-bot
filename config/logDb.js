require('dotenv').config();
const mongoose = require('mongoose');

// Get the URI from environment variables
const logDbUri = process.env.MONGO_LOG_URI;

if (!logDbUri) {
    console.error('MONGO_LOG_URI is not defined. Logging database will not connect.');
    // Export a mock object or handle this error as you see fit
    // For now, we'll throw an error to make it obvious during development.
    throw new Error('MONGO_LOG_URI environment variable is not set.');
}

// Create a new connection
const logDbConnection = mongoose.createConnection(logDbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    // You might want to tune these for a high-volume log database
    // autoIndex: false, // Indexing can be managed manually or at deploy time
    // bufferCommands: false, // Disable buffering if connection is down
});

// --- Connection Event Listeners ---

logDbConnection.on('connected', () => {
    console.log(`[Mongoose] Connected to logging database: ${logDbUri}`);
});

logDbConnection.on('error', (err) => {
    console.error(`[Mongoose] Logging database connection error: ${err}`);
});

logDbConnection.on('disconnected', () => {
    console.log('[Mongoose] Logging database disconnected');
});

// Graceful shutdown
process.on('SIGINT', async () => {
    await logDbConnection.close();
    process.exit(0);
});

// Export the connection
module.exports = logDbConnection;

