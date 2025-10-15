const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Define the directory for bot-specific logs
const logDir = path.join(__dirname, 'reports', 'bots');

// Ensure the directory exists
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

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
            format: format.combine(
                format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                format.printf(({ timestamp, level, message, stack }) => {
                    // If this log was created from an Error object, include the stack
                    if (stack) {
                        return `${timestamp} [${level.toUpperCase()}] ${message}\n${stack}`;
                    }
                    return `${timestamp} [${level.toUpperCase()}] ${message}`;
                })
            ),
            transports: [
                // Log to a daily rotated file specific to the bot ID
                new transports.File({
                    filename: path.join(logDir, `bot-${botId}.log`),
                    // datePattern: 'YYYY-MM-DD',
                    zippedArchive: true,
                    maxSize: '10m',  // Smaller size per bot file
                    // maxFiles: '7d',    // Keep logs for 7 days
                }),
            ],
        });

        // Add to console in non-production environments for easy debugging
        if (process.env.NODE_ENV !== 'production') {
            botLogger.add(new transports.Console({
                format: format.combine(
                    format.colorize(),
                    format.simple()
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
