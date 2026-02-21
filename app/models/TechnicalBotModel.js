// app/models/TechnicalBotModel.js
const mongoose = require('mongoose');
const { Schema } = mongoose;
const BotBase = require('./BotBase');

/**
 * Sub-schemas specific to Technical/Strategy Bots
 */
const strategyParamsSchema = new Schema({
    shortPeriod: { type: Number, min: 1 },
    longPeriod:  { type: Number, min: 1 },
    period:      { type: Number, min: 1 },
    overbought:  { type: Number },
    oversold:    { type: Number },
    jobId:       { type: String }, // N8N support
    generatedCode: { type: String }
}, { _id: false, strict: false });

const riskParamsSchema = new Schema({
    maxDrawdown:          { type: Number },
    dailyLossLimit:       { type: Number },
    positionSizingMethod: { type: String, enum: ['compound','simple'] },
    riskFraction:         { type: Number },
    stopLossDistance:     { type: Number },
    positionSizeType:     { type: String, enum: ['percentage','fixed'] },
    positionSizeValue:    { type: Number },
    maxOpenTrades:        { type: Number }
}, { _id: false });

const marketInfoSchema = new Schema({
    state:      { type: String, default: 'inactive' },
    baseFund:   { type: Number, default: 10000 },
    tradeFund:  { type: Number, default: 50 },
    lastCandle: {
        timestamp: { type: Date },
        open:      { type: Number },
        high:      { type: Number },
        low:       { type: Number },
        close:     { type: Number },
        volume:    { type: Number }
    },
    currentCandle: { price: { type: Number } },
    lastSignal:    { type: String, default: 'HOLD' }
}, { _id: false });

const tradeInfoSchema = new Schema({
    takeProfit:            { type: Number },
    stopLoss:              { type: Number },
    positionTakeProfit:    { type: Number },
    positionStopLoss:      { type: Number },
    leverageLong:          { type: Number, default: 1 },
    leverageShort:         { type: Number, default: 1 },
    side:                  { type: String, enum: ['buy','sell'] },
    positionSide:          { type: String, enum: ['long','short'] },
    winProbability:        { type: Number },
    payoffRatio:           { type: Number },
    lastTradeOutcome:      { type: String },
    positionSizingMethod:  { type: String, enum: ['compound','simple'] },
    tradingStrategy:       { type: String, enum: ['default','optimized','dynamic'] },
    optimizationMethod:    { type: String, enum: ['grid','bayesian','ann'] },
    minimumTrade:          { type: Number },
    minimumWinRatio:       { type: Number },
    minimumAccuracy:       { type: Number },
    minSimulatedTrades:    { type: Number },
    minBotAccuracy:        { type: Number },
    configId:              { type: String },
    signalProcessingMethod:{ type: String, enum: ['weighted','consensus'] }
}, { _id: false });

const indicatorConfigSchema = new Schema({
    name: {
        type: String,
        required: true,
        enum: [
            'RSI', 'MACD', 'MA_Crossover', 'Donchian',
            'Volume', 'Heikin_Ashi', 'Combined_RSI_MACD',
            'Bollinger_Bands', 'Stochastic_RSI',
            'N8NBotRunner', 'N8nStrategy',
            'SmoothedHeikinAshi', 'ATR'
        ]
    },
    timeframe: {
        type: String,
        required: true,
        enum: ['1m','5m','15m','30m','1h','4h','1d','1w']
    },
    params: {
        type: strategyParamsSchema,
        default: () => ({})
    }
}, { _id: false });

/**
 * TechnicalBot Schema
 * Extends BotBase with strategy, indicators, and detailed risk settings.
 */
const TechnicalBotSchema = new Schema({
    // timeframe is now inherited from BotBase

    indicators:   [indicatorConfigSchema],

    riskStrategy: { type: String, required: true },
    riskParams:   riskParamsSchema,

    marketInfo:   marketInfoSchema,
    tradeInfo:    tradeInfoSchema,

    // Advanced configuration fields
    positionMode: { type: String, enum: ['hedge','single'] },
    fundMode:     { type: String, enum: ['isolated','cross'] },
    userLevel:    { type: Number, default: 1 },

    // Bot specific TP/SL (distinct from individual trade TP/SL)
    botTP:        { type: Number, default: 0 },
    botSL:        { type: Number, default: 0 },

    share:        { type: Boolean, default: false }

}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Index for typical technical bot lookups
TechnicalBotSchema.index({ symbol: 1, timeframe: 1 });

const TechnicalBotModel = BotBase.discriminator('technical', TechnicalBotSchema);

module.exports = TechnicalBotModel;
