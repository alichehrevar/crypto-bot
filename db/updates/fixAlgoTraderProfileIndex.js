const AlgoTraderProfile = require('./../../app/models/AlgoTraderProfile');
const logger = require("../../logs/logger");

async function fixAlgoTraderProfileIndex() {
    try {
        // This drops the specific index causing the conflict
        await AlgoTraderProfile.collection.dropIndex('extra.email_1');
        console.log('Successfully dropped the legacy index: extra.email_1');
    } catch (error) {
        // If the index doesn't exist, it throws an error, which is fine
        if (error.code === 27) {
            console.log('Index did not exist, nothing to do.');
        } else {
            logger.error('Error dropping index:', error.message);
            console.error('Error dropping index:', error.message);
        }
    }
}

module.exports = { fixAlgoTraderProfileIndex }
