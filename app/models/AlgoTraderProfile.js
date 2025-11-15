const UserInfo = require('./UserInfo');
const { Schema } = require('mongoose');

/**
 * gridConfig – parameters specifically for a grid strategy
 */
const AlgoTraderProfile = new Schema({
    nickname: {
        type: String,
        required: true
    },
    waitlist: {
        type: Boolean,
        default: false
    }
}, {
    _id: false,
});

const algoTraderProfileSchema = new Schema({
    extra: {
        type: AlgoTraderProfile,
        required: true
    }
});

module.exports = UserInfo.discriminator('traderProfile', algoTraderProfileSchema);
