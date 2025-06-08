// app/models/BacktestRun.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const IndicatorParamSchema = new Schema({
    indicator:    { type: String, required: true },
    timeframe:    { type: String, required: true },
    params:       { type: Schema.Types.Mixed, default: {} }
}, { _id: false });

const RiskOptionSchema = new Schema({
    investment:     Number,
    leverage:       Number,
    takeProfitPct:  Number,
    stopLossPct:    Number
}, { _id: false });

const BacktestRunSchema = new Schema({
    userId:          { type: Schema.Types.ObjectId, ref: 'User', required: true },
    symbol:          { type: String, required: true },
    mode:            { type: String, enum: ['recent','range'], required: true },
    recentCount:     { type: Number },
    startDate:       { type: Date },
    endDate:         { type: Date },
    indicators:      { type: [IndicatorParamSchema], required: true },
    optimize:        { type: Boolean, default: false },
    optimizationMethod: { type: String, enum: ['grid','bayesian','ann'] },
    minAccuracy:     { type: Number },
    minTrades:       { type: Number },
    useRisk:         { type: Boolean, default: false },
    riskOptions:     { type: RiskOptionSchema },
    initialBalance:  { type: Number, default: 10000 },
    finalBalance:    { type: Number, required: true, default: 10000 },
    metrics:         { type: Schema.Types.Mixed, required: true },
    trades:          { type: [Schema.Types.Mixed], default: [] },
}, {
    timestamps: true
});

module.exports = mongoose.model('BacktestRun', BacktestRunSchema);
