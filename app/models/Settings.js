const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
    name: String,
    description: String,
    version: String,
    contactEmail: String,
    supportEmail: String,
    supportPhone: String,
    defaultCurrency: String,
    enableEmail: Boolean,
});

module.exports = mongoose.model('Setting', settingSchema);
