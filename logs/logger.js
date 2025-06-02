// app/logger.js

const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');
const path = require('path');

// 1) Define a daily‐rotate transport.
//    This will create one log file per day under "logs/" named "app-YYYY-MM-DD.log".
const rotateTransport = new transports.DailyRotateFile({
    filename: path.join(__dirname, '..', 'logs', 'app-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',            // optional: rotate if file > 20MB
    maxFiles: '14d',           // keep logs for 14 days
    level: 'info',             // write logs of level 'info' and above
});

// 2) Create the Winston logger instance.
const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        // Include the timestamp and level in every message:
        format.printf(({ timestamp, level, message, stack }) => {
            // If this log was created from an Error object, include the stack:
            if (stack) {
                return `${timestamp} [${level.toUpperCase()}] ${message}\n${stack}`;
            }
            return `${timestamp} [${level.toUpperCase()}] ${message}`;
        })
    ),
    transports: [
        // 2a) Print to console (dev mode)
        new transports.Console({
            format: format.combine(
                format.colorize(),
                format.printf(({ timestamp, level, message, stack }) => {
                    if (stack) {
                        return `${timestamp} [${level}] ${message}\n${stack}`;
                    }
                    return `${timestamp} [${level}] ${message}`;
                })
            )
        }),
        // 2b) Write all 'info' and above to daily-rotated files:
        rotateTransport,
    ],
    // 3) Also catch any uncaught exceptions and send them to file:
    exceptionHandlers: [
        new transports.DailyRotateFile({
            filename: path.join(__dirname, '..', 'logs', 'exceptions-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '30d',
            level: 'error'
        }),
        new transports.Console({
            format: format.combine(
                format.colorize(),
                format.printf(({ timestamp, level, message, stack }) => {
                    if (stack) {
                        return `${timestamp} [${level}] ${message}\n${stack}`;
                    }
                    return `${timestamp} [${level}] ${message}`;
                })
            )
        })
    ]
});

module.exports = logger;
