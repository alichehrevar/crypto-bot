// utils/delay.js

/**
 * A simple delay helper function to pause execution.
 * @param {number} ms - The number of milliseconds to wait.
 * @returns {Promise<void>}
 */
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = delay;
