const mongoose = require('mongoose');
const { Schema } = mongoose;

const algoTraderProfileSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    nickname: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('traderProfile', algoTraderProfileSchema);
