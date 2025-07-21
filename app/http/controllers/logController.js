// controllers/logController.js
const fs = require('fs');
const path = require('path');

// 1) Directory where Winston writes daily log files:
const LOG_DIR = path.join(__dirname, '../../../logs/reports');

// Helper: only return filenames that match `app-YYYY-MM-DD.log`
function listLogFiles() {
    try {
        const all = fs.readdirSync(LOG_DIR);
        return all
            .filter(f => /^(?:app|exceptions)-\d{4}-\d{2}-\d{2}\.log(?:\.gz)?$/.test(f))
            .sort()
            .reverse(); // newest first
    } catch (err) {
        return [];
    }
}

/**
 * Controller function to retrieve all logs.
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
exports.getLogsFiles = (req, res) => {
    const files = listLogFiles();
    return res.json({ success: true, files });
};

exports.getLogFile = (req, res) => {
    const { filename } = req.params;
    // Validate against our list:
    const files = listLogFiles();
    if (!files.includes(filename)) {
        return res.status(404).json({ success: false, error: 'Log file not found' });
    }
    const fullPath = path.join(LOG_DIR, filename);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    // Stream the file back (so large logs don’t blow memory)
    const stream = fs.createReadStream(fullPath);
    stream.on('error', _ => {
        return res.status(500).end('Could not read log file');
    });
    stream.pipe(res);
}
