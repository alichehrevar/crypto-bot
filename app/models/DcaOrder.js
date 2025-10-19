const mongoose = require('mongoose');
const { Schema } = mongoose;

const DcaOrderSchema = new Schema({
    botId: { type: Schema.Types.ObjectId, ref: 'BotBase', required: true, index: true },
    exchangeOrderId: { type: String, index: true },
    clientOrderId: { type: String, unique: true, sparse: true },
    type: {
        type: String,
        enum: ["BASE", "SAFETY", "TAKE_PROFIT", "STOP_LOSS"],
        required: true
    },
    side: { type: String, enum: ["BUY", "SELL"], required: true },
    status: {
        type: String,
        enum: ["PENDING_PLACEMENT", "OPEN", "PARTIALLY_FILLED", "FILLED", "CANCELED", "PENDING_CANCEL", "FAILED_PLACEMENT"],
        default: "PENDING_PLACEMENT"
    },
    price: { type: Number },
    qty: { type: Number, required: true },
    reduceOnly: { type: Boolean, default: false },
    step: { type: Number }, // Safety order step number
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
}, {
    timestamps: true
});

const DcaOrder = mongoose.model('DcaOrder', DcaOrderSchema);

module.exports = DcaOrder;
