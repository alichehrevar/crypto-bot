const { createLogger, format, transports } = require('winston');
// Import the new transport
require('winston-mongodb');

// Import our dedicated log database connection
const logDbConnection = require('../config/logDb');

// No longer need fs or path for file logging
// const path = require('path');
// const fs = require('fs');
// const logDir = path.join(__dirname, 'reports', 'bots');
// if (!fs.existsSync(logDir)) {
//     fs.mkdirSync(logDir, { recursive: true });
// }

class BotLoggerService {
    constructor() {
        // Cache for logger instances <botId, logger>
        this.loggers = new Map();
    }

    /**
     * Retrieves or creates a Winston logger for a specific bot.
     * @param {string} botId - The MongoDB ObjectId of the bot.
     * @returns {import('winston').Logger} A Winston logger instance.
     */
    getLogger(botId) {
        // If a logger for this bot is already cached, return it
        if (this.loggers.has(botId)) {
            return this.loggers.get(botId);
        }

        // --- Create a new logger instance for this specific bot ---
        const botLogger = createLogger({
            level: 'info',

            // --- CRITICAL ---
            // Add the botId to *every single log message* automatically.
            defaultMeta: { botId: botId },

            // We now use format.json() to store logs as structured objects.
            // This is *much* better than printf, as it preserves
            // data types and allows you to log objects.
            // e.g., logger.info("Candles fetched", { count: 16, symbol: "BTCUSDT" })
            format: format.combine(
                format.timestamp(),
                // This is for logging Error objects
                format.errors({ stack: true }),
                // This is the magic. It will combine `message`, `level`, `timestamp`,
                // and your `defaultMeta` into a single JSON object.
                format.json()
            ),

            transports: [
                // --- NEW: MongoDB Transport ---
                new transports.MongoDB({
                    level: 'info',
                    // Pass our dedicated Mongoose connection
                    db: logDbConnection,
                    // Collection name must match our model
                    collection: 'botlogs',
                    // We use a capped collection, as defined in the model
                    capped: true,
                    // This ensures meta data (like our botId) is properly stored
                    format: format.combine(format.metadata()),
                }),
            ],
        });

        // Add to console in non-production environments
        if (process.env.NODE_ENV !== 'production') {
            botLogger.add(new transports.Console({
                format: format.combine(
                    format.colorize(),
                    // A simpler format for the console
                    format.printf(({ timestamp, level, message, botId, stack, ...meta }) => {
                        const time = new Date(timestamp).toLocaleTimeString();
                        let log = `${time} [${level}] (Bot: ${botId}): ${message}`;

                        // Print stack if it exists
                        if (stack) {
                            log += `\n${stack}`;
                        }

                        // Print any other metadata
                        const metaKeys = Object.keys(meta);
                        if (metaKeys.length > 0) {
                            log += `\n${JSON.stringify(meta, null, 2)}`;
                        }
                        return log;
                    })
                )
            }));
        }

        // Cache the new logger and return it
        this.loggers.set(botId, botLogger);
        return botLogger;
    }
}

// Export a singleton instance
module.exports = new BotLoggerService();

