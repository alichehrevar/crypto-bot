const pino = require('pino');
const gridLogger = pino({ level: process.env.LOG_LEVEL || 'info' });  // JSON structured logs
module.exports = gridLogger;
