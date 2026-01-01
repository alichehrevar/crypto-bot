// app/models/BingxAccount.js
const mongoose = require('mongoose');
const { Schema } = mongoose;
const Account = require('./Account');

const BingxAccountSchema = new Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    apiKey: { type: String, required: true },
    secretKey: { type: String, required: true },
    // Add any additional fields specific to BingX (e.g., passphrase, account type)
    createdAt: { type: Date, default: Date.now }
});

module.exports = Account.discriminator('BingxAccount', BingxAccountSchema);
