const mongoose = require('mongoose');
const { Schema } = mongoose;

const userInfoSchema = new mongoose.Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    phoneCountry: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: String,
        required: true
    },
    birthday: {
        type: Date,
        required: true
    },
    avatar: {
        type: String,
        required: false
    }
});

module.exports = mongoose.model('UserInfo', userInfoSchema);
