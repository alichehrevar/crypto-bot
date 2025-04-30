const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * strategyParamsSchema:
 * Parameters for technical indicators (e.g., RSI, MACD, etc.).
 */
const strategyParamsSchema = new Schema({
    shortPeriod: { type: Number, min: 1 },   // For MA_Crossover, MACD
    longPeriod:  { type: Number, min: 1 },   // For MA_Crossover, MACD
    period:      { type: Number, min: 1 },   // For RSI, Bollinger Bands, etc.
    overbought:  { type: Number },           // For RSI
    oversold:    { type: Number }            // For RSI
}, { _id: false });

/**
 * riskParamsSchema:
 * Money management parameters.
 */
const riskParamsSchema = new Schema({
    maxDrawdown:          { type: Number },
    dailyLossLimit:       { type: Number },
    positionSizingMethod: { type: String, enum: ['compound','simple'] },
    riskFraction:         { type: Number },  // for compound sizing
    stopLossDistance:     { type: Number },
    positionSizeType:     { type: String, enum: ['percentage','fixed'] },
    positionSizeValue:    { type: Number },
    maxOpenTrades:        { type: Number }
}, { _id: false });

/**
 * marketInfoSchema:
 * Tracks last and current candle data plus base/trade funds.
 */
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

/**
 * tradeInfoSchema:
 * Configuration for each trade.
 */
const tradeInfoSchema = new Schema({
    takeProfit:            { type: Number },
    stopLoss:              { type: Number },
    leverage:              { type: Number, default: 1 },
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
    configId:              { type: String },
    signalProcessingMethod:{ type: String, enum: ['weighted','consensus'] }
}, { _id: false });

/**
 * indicatorConfigSchema:
 * Defines one technical indicator configuration for a bot.
 */
const indicatorConfigSchema = new Schema({
    name: {
        type: String,
        required: true,
        enum: [
            'RSI', 'MACD', 'MA_Crossover', 'Donchian',
            'Volume', 'Heikin_Ashi', 'Combined_RSI_MACD',
            'Bollinger_Bands', 'Stochastic_RSI'
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
 * botSchema:
 * Main Bot document.
 */
const botSchema = new Schema({
    name:       { type: String, required: true },
    symbol:     { type: String, required: true, match: [/^[A-Z]+\/[A-Z]+$/, 'Use BASE/QUOTE'] },
    timeframe:  { type: String, required: true, enum: ['1m','5m','15m','30m','1h','4h','1d','1w'] },

    // now an array of indicators instead of single indicator + params
    indicators: {
        type: [indicatorConfigSchema],
        required: true,
        validate: v => Array.isArray(v) && v.length > 0
    },

    riskStrategy: { type: String, required: true },
    riskParams:   riskParamsSchema,

    marketInfo: marketInfoSchema,
    tradeInfo:  tradeInfoSchema,

    userId:     { type: Schema.Types.ObjectId, ref: 'User' },
    botType:    { type: String, enum: ['indicator','grid','DCA'] },
    positionMode:{ type: String, enum: ['hedge','single'] },
    fundMode:   { type: String, enum: ['isolated','cross'] },
    userLevel:  { type: Number, default: 1 },
    active:     { type: Boolean, default: false },
    mode:       { type: String, enum: ['live','paper'], default: 'paper' },
    paperBalance:{ type: Number, default: 10000 },
    cumulativePnL:{ type: Number, default: 0 },
    botTP:      { type: Number, default: 0 },
    botSL:      { type: Number, default: 0 }
}, { timestamps: true });

// Prevent duplicate bots on same symbol/timeframe + exact indicator set if desired
botSchema.index({ symbol: 1, timeframe: 1 }, { unique: false });

module.exports = mongoose.model('Bot', botSchema);
