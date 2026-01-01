// models/BinanceAccount.js
const mongoose = require('mongoose');
const { Schema } = mongoose;
const Account = require('./Account');

const binanceAccountSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    apiKey: { type: String, required: true },
    secretKey: { type: String, required: true },
    // Optionally store additional metadata (e.g., account balance, update time, etc.)
    createdAt: { type: Date, default: Date.now }
});

module.exports = Account.discriminator('BinanceAccount', binanceAccountSchema);
