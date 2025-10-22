// models/DcaFill.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const DcaFillSchema = new Schema({
    exchangeTradeId: { type: String, unique: true, index: true, required: true },
    botId: { type: Schema.Types.ObjectId, ref: 'BotBase', required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'DcaOrder', required: true, index: true },
    price: { type: Number, required: true },
    qty: { type: Number, required: true },
    fee: { type: Number },          // optional
    feeAsset: { type: String },     // optional
}, { timestamps: true });

module.exports = mongoose.model('DcaFill', DcaFillSchema);
