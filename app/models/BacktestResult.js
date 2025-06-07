// app/models/BacktestResult.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const TradeSchema = new Schema({
    entry:       Number,
    exit:        Number,
    profit:      Number,
    entryTime:   Date,
    exitTime:    Date,
    duration:    Number,
    closedBy:    String,
    unrealized:  { type: Boolean, default: false }
}, { _id: false });

const BacktestResultSchema = new Schema({
    userId:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
    symbol:       { type: String, required: true },
    mode:         { type: String, enum: ['recent','range'], required: true },
    recentCount:  { type: Number },
    startDate:    { type: Date },
    endDate:      { type: Date },
    indicators:   [{
        indicator: { type: String, required: true },
        timeframe: { type: String, required: true },
        params:    { type: Schema.Types.Mixed }
    }],
    optimize:     { type: Boolean, default: false },
    optimizationMethod: { type: String, enum: ['grid','bayesian','ann'] },
    minAccuracy:  Number,
    minTrades:    Number,
    risk: {
        investment:    Number,
        leverage:      Number,
        takeProfitPct: Number,
        stopLossPct:   Number
    },
    initialBalance: { type: Number, default: 10000 },
    finalBalance:   Number,
    metrics:        Schema.Types.Mixed,
    trades:         [TradeSchema],
    createdAt:      { type: Date, default: Date.now }
});

module.exports = mongoose.model('BacktestResult', BacktestResultSchema);
