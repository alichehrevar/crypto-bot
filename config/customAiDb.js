require('dotenv').config();
const mongoose = require('mongoose');

// Get the URI from environment variables
const customAiDbUri = process.env.MONGO_AI_URI;

if (!customAiDbUri) {
    console.error('MONGO_AI_URI is not defined. Logging database will not connect.');
    // Export a mock object or handle this error as you see fit
    // For now, we'll throw an error to make it obvious during development.
    throw new Error('MONGO_AI_URI environment variable is not set.');
}

// Create a new connection
const customAiDbConnection = mongoose.createConnection(customAiDbUri, {
    // You might want to tune these for a high-volume log database
    // autoIndex: false, // Indexing can be managed manually or at deploy time
    // bufferCommands: false, // Disable buffering if connection is down
});

// --- Connection Event Listeners ---

customAiDbConnection.on('connected', () => {
    console.log(`[Mongoose] Connected to logging database: ${customAiDbUri}`);
});

customAiDbConnection.on('error', (err) => {
    console.error(`[Mongoose] Logging database connection error: ${err}`);
});

customAiDbConnection.on('disconnected', () => {
    console.log('[Mongoose] Logging database disconnected');
});

// Graceful shutdown
process.on('SIGINT', async () => {
    await customAiDbConnection.close();
    process.exit(0);
});

// Export the connection
module.exports = customAiDbConnection;

