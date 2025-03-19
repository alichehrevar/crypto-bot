// models/OkxAccount.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const okxAccountSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    apiKey: { type: String, required: true },
    secretKey: { type: String, required: true },
    passphrase: { type: String, required: true }, // OKX requires an additional passphrase.
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('OkxAccount', okxAccountSchema);
