// logEmitter.js
const EventEmitter = require('events');

class LogEmitter extends EventEmitter {}
const logEmitter = new LogEmitter();

// Preserve the original console.log using bind to fix the context.
const originalConsoleLog = console.log.bind(console);

// Optional: Array to store logs
const logs = [];

// Override console.log to emit log events and store logs
console.log = (...args) => {
    const message = args.join(' ');

    // Use the preserved original console.log to avoid recursion.
    originalConsoleLog(...args);

    // Store the log with a timestamp.
    logs.push({ timestamp: new Date(), message });

    // Emit the log event.
    logEmitter.emit('log', message);
};

// Export logEmitter, logs, and the originalConsoleLog for use in other modules.
module.exports = { logEmitter, logs, originalConsoleLog };
