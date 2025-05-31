/*
 * standardGridBot.js
 *
 * Inherits from GridBot.
 * IO:
 *   - Input: config object, exchange instance.
 *   - Output: A StandardGridBot instance that supports both fixed and percentage-based grids.
 */
const GridBot = require('./gridBot');

class StandardGridBot extends GridBot {
    constructor(config, exchange) {
        // Call the parent GridBot constructor with the provided config and exchange
        super(config, exchange);
        // Additional initialization if needed.
        // This bot supports both fixed and percentage-based grids via config.gridType.
    }
}

module.exports = StandardGridBot;
