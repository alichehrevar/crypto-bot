// app/models/BotBase.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Shared sub‐schemas (reused by IndicatorBot and, optionally, others)
 */
const strategyParamsSchema = new Schema({
    // --- EXISTING PARAMS (Unchanged) ---
    shortPeriod: { type: Number, min: 1 },
    longPeriod:  { type: Number, min: 1 },
    period:      { type: Number, min: 1 },
    overbought:  { type: Number },
    oversold:    { type: Number },

    // --- NEW N8N PARAMS (Explicit definitions optional due to strict: false) ---
    jobId:         { type: String },
    generatedCode: { type: String }

}, {
    _id: false,
    strict: false // Allows dynamic params
});

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
    currentCandle: {
        price:    { type: Number }
    },
    lastSignal: { type: String, default: 'HOLD' }
}, { _id: false });

const tradeInfoSchema = new Schema({
    takeProfit:            { type: Number },
    stopLoss:              { type: Number },
    positionTakeProfit:    { type: Number, required: false },
    positionStopLoss:      { type: Number, required: false },
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

            // --- ADDED FOR N8N SUPPORT ---
            'N8NBotRunner', 'N8nStrategy'
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
 * Base schema for all bots (Indicator, Grid, etc.)
 */
const baseBotSchema = new Schema({
    name:      { type: String, required: true },
    symbol:    {
        type: String,
        required: true,
    },
    timeframe: {
        type: String,
        required: true,
        enum: ['1m','5m','15m','30m','1h','4h','1d','1w']
    },

    userId:    { type: Schema.Types.ObjectId, ref: 'User' },

    // Added 'technical' for N8N support, 'indicator' is standard
    botType:   { type: String, required: true, enum: ['indicator','grid','dca', 'technical'] },

    riskStrategy: { type: String, required: true },
    riskParams:   riskParamsSchema,

    marketInfo:   marketInfoSchema,
    tradeInfo:    tradeInfoSchema,

    indicators: [indicatorConfigSchema],

    positionMode:{ type: String, enum: ['hedge','single'] },
    fundMode:   { type: String, enum: ['isolated','cross'] },
    userLevel:  { type: Number, default: 1 },
    active:     { type: Boolean, default: false },
    mode:       { type: String, enum: ['live','paper'], default: 'paper' },
    paperBalance:{ type: Number, default: 10000 },
    cumulativePnL:{ type: Number, default: 0 },
    botTP:      { type: Number, default: 0 },
    botSL:      { type: Number, default: 0 },

    share:      { type: Boolean, default: false },

    accountType:{ type: String, required: true, enum: ['binance','okx','bingx','n8n'] },
    accountId:  {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Account'
    }

}, {
    discriminatorKey: 'botType',
    timestamps: true
});

// Index on (symbol, timeframe)
baseBotSchema.index({ symbol: 1, timeframe: 1 });

module.exports = mongoose.model('BotBase', baseBotSchema);
