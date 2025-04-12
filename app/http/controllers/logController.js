// controllers/logController.js
const { logs } = require('../../../logs/logEmitter');

/**
 * Controller function to retrieve all logs.
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
exports.getLogs = (req, res) => {
    res.json(logs);
};
