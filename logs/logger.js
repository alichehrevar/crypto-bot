// app/logger.js
require('dotenv').config(); // Load .env variables

const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');
const Transport = require('winston-transport');
const path = require('path');
const axios = require('axios');

// --- CONFIGURATION ---
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Helper to sanitize text for Telegram HTML parse mode
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ---------------------------------------------------------
// 1) Define Custom Telegram Transport
// ---------------------------------------------------------
class TelegramLogger extends Transport {
    constructor(opts) {
        super(opts);
        this.token = opts.token;
        this.chatId = opts.chatId;
    }

    log(info, callback) {
        setImmediate(() => {
            this.emit('logged', info);
        });

        if (!this.token || !this.chatId) {
            return callback();
        }

        const { level, message, timestamp, stack } = info;

        if (process.env.NODE_ENV === 'development') return null;

        // Escape content to prevent Telegram parsing errors
        const safeMessage = escapeHtml(message);

        // Visuals
        const icon = level === 'error' ? '🚨' : '⚠️';
        const projectTag = '#UnitedAlgos'; // Optional: Helps filtering in Telegram search

        // Build HTML Message
        let text = `<b>${icon} Error Report</b> ${projectTag}\n`;
        text += `<code>${timestamp}</code>\n\n`;
        text += `<b>Message:</b>\n${safeMessage}\n`;

        if (stack) {
            const safeStack = escapeHtml(stack);
            // Truncate to avoid hitting 4096 char limit
            const truncatedStack = safeStack.length > 3000
                ? safeStack.substring(0, 3000) + '\n...[truncated]'
                : safeStack;

            text += `\n<b>Stack Trace:</b>\n<pre>${truncatedStack}</pre>`;
        }

        // Send
        axios.post(`https://api.telegram.org/bot${this.token}/sendMessage`, {
            chat_id: this.chatId,
            text: text,
            parse_mode: 'HTML'
        }).catch(err => {
            // Prevent infinite loops (logging logging errors)
            console.error('Telegram Transport Error:', err.message);
        });

        callback();
    }
}

// ---------------------------------------------------------
// 2) Instantiate Transports
// ---------------------------------------------------------

const rotateTransport = new transports.DailyRotateFile({
    filename: path.join(__dirname, '..', 'logs/reports', 'app-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    level: 'info',
});

// Configure Telegram Transport (Errors only)
const telegramTransport = new TelegramLogger({
    token: TELEGRAM_TOKEN,
    chatId: TELEGRAM_CHAT_ID,
    level: 'error',
    format: format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
});

// ---------------------------------------------------------
// 3) Create Logger
// ---------------------------------------------------------
const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.printf(({ timestamp, level, message, stack }) => {
            return stack
                ? `${timestamp} [${level.toUpperCase()}] ${message}\n${stack}`
                : `${timestamp} [${level.toUpperCase()}] ${message}`;
        })
    ),
    transports: [
        new transports.Console({
            format: format.combine(
                format.colorize(),
                format.simple() // simpler console output
            )
        }),
        rotateTransport,
        telegramTransport
    ],
    exceptionHandlers: [
        new transports.DailyRotateFile({
            filename: path.join(__dirname, '..', 'logs/reports', 'exceptions-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '30d',
            level: 'error'
        }),
        new transports.Console({
            format: format.combine(format.colorize(), format.simple())
        }),
        // Send Uncaught Exceptions to Telegram
        telegramTransport
    ]
});

module.exports = logger;
