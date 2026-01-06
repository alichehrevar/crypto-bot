const { createLogger, format, transports } = require('winston');
// Import MongoDB transport
require('winston-mongodb');
// Import Daily Rotate File transport (Critical for file management)
require('winston-daily-rotate-file');

const path = require('path');
const fs = require('fs');
const logDbConnection = require('../config/logDb');

// Ensure the log directory exists for the File Transport
// This creates: /logs/reports/bots/
const logBaseDir = path.join(__dirname, 'reports', 'bots');
if (!fs.existsSync(logBaseDir)) {
    fs.mkdirSync(logBaseDir, { recursive: true });
}

class BotLoggerService {
    constructor() {
        // Cache for logger instances <botId, logger>
        // Prevents creating multiple loggers for the same bot
        this.loggers = new Map();
    }

    /**
     * Retrieves or creates a Winston logger for a specific bot.
     * @param {string} botId - The MongoDB ObjectId of the bot.
     * @returns {import('winston').Logger} A Winston logger instance.
     */
    getLogger(botId) {
        // If a logger for this bot is already cached, return it to save resources
        if (this.loggers.has(botId)) {
            return this.loggers.get(botId);
        }

        // --- Create a new logger instance for this specific bot ---
        const botLogger = createLogger({
            level: 'info', // Default logging level

            // Adds { botId: ... } to every log automatically
            defaultMeta: { botId: botId },

            transports: [

                // 1. MONGODB TRANSPORT (Hot Data)
                // - Used by Frontend Dashboard
                // - Relies on the TTL Index in BotLog model to auto-delete old logs
                new transports.MongoDB({
                    db: logDbConnection, // Uses your dedicated log DB connection
                    collection: 'botlogs',
                    options: { useUnifiedTopology: true },
                    metaKey: 'meta', // Puts extra data (botId, prices) into the 'meta' field
                    format: format.combine(format.metadata()),
                }),

                // 2. FILE TRANSPORT (Cold Data / Backup)
                // - Keeps 4 hours of history
                // - Auto-rotates files daily
                // - Zips old files to save disk space
                // - Path: logs/reports/bots/654a...-2026-01-02.log
                new transports.DailyRotateFile({
                    filename: path.join(logBaseDir, `${botId}-%DATE%.log`),
                    datePattern: 'YYYY-MM-DD',
                    zippedArchive: true, // Compress old logs
                    maxSize: '20m',      // Rotate if a single file hits 20MB
                    maxFiles: '4h',     // Delete files older than 4 hours
                    format: format.combine(
                        format.timestamp(),
                        format.json()    // Save as JSON for easier parsing/debugging later
                    )
                }),

                // 3. CONSOLE TRANSPORT (Live Debugging)
                // - Prints to your terminal so you can see what's happening real-time
                new transports.Console({
                    format: format.combine(
                        format.colorize(),
                        format.printf(({ timestamp, level, message, botId, stack, ...meta }) => {
                            // Only print timestamp if it exists, else use current time
                            const ts = timestamp ? new Date(timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();

                            let log = `${ts} [${level}] (Bot: ${botId}): ${message}`;

                            // Print stack trace if error
                            if (stack) log += `\n${stack}`;

                            // Print any extra metadata (like price, signal details)
                            const metaKeys = Object.keys(meta);
                            if (metaKeys.length > 0) {
                                // Exclude Mongo metadata if it leaks here
                                delete meta._id;
                                log += `\n${JSON.stringify(meta)}`;
                            }
                            return log;
                        })
                    )
                })
            ]
        });

        // Cache the new logger
        this.loggers.set(botId, botLogger);
        return botLogger;
    }
}

module.exports = new BotLoggerService();
