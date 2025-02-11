const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Sub-schema for strategy parameters.
 * (For example, used with the MA_Crossover strategy.)
 */
const strategyParamsSchema = new Schema({
    shortPeriod: { type: Number, min: 1 },
    longPeriod: { type: Number, min: 1 }
}, { _id: false });

/**
 * Sub-schema for risk parameters.
 * (These parameters cover risk management limits such as max drawdown or daily loss limits.)
 */
const riskParamsSchema = new Schema({
    maxDrawdown: { type: Number },
    dailyLossLimit: { type: Number },
    positionSizeType: { type: String, enum: ['percentage', 'fixed'] },
    positionSizeValue: { type: Number },
    maxOpenTrades: { type: Number }
}, { _id: false });

/**
 * Sub-schema for market information.
 * (This includes the current state of the market, allocated funds, and the latest candle data.)
 */
const marketInfoSchema = new Schema({
    state: { type: String, default: 'inactive' },
    baseFund: { type: Number, default: 0 },
    tradeFund: { type: Number, default: 0 },
    // New field to store the latest candle data.
    lastCandle: {
        timestamp: { type: Date },
        open: { type: Number },
        high: { type: Number },
        low: { type: Number },
        close: { type: Number },
        volume: { type: Number }
    },
    lastSignal: { type: String, default: 'HOLD' },
}, { _id: false });

/**
 * Sub-schema for trade information.
 * (This groups all trading-related settings together.)
 */
const tradeInfoSchema = new Schema({
    // Take Profit / Stop Loss settings
    takeProfit: { type: Number },
    stopLoss: { type: Number },
    // Leverage and direction
    leverage: { type: Number },
    side: { type: String, enum: ['buy', 'sell'] },
    positionSide: { type: String, enum: ['long', 'short'] },
    // Additional trade metrics
    winProbability: { type: Number },
    payoffRatio: { type: Number },
    // Outcome and risk management
    lastTradeOutcome: { type: String }, // e.g., "win" or "loss"
    positionSizingMethod: { type: String, enum: ['compound', 'single'] },
    tradingStrategy: { type: String, enum: ['default', 'optimized', 'dynamic'] },
    optimizationMethod: { type: String, enum: ['grid', 'bayesian', 'ann'] },
    // Minimum requirements
    minimumTrade: { type: Number },
    minimumWinRatio: { type: Number },
    minimumAccuracy: { type: Number },
    // Additional configuration
    configId: { type: String },
    signalProcessingMethod: { type: String, enum: ['weighted', 'consensus'] }
}, { _id: false });

/**
 * Main Bot Schema.
 * This schema combines basic bot settings with nested configurations for market, trade,
 * strategy, and risk parameters.
 */
const botSchema = new Schema({
    // Basic Information
    name: { type: String, required: true },
    symbol: {
        type: String,
        required: true,
        match: [/^[A-Z]+\/[A-Z]+$/, 'Use format: BASE/QUOTE (e.g. BTC/USDT)']
    },
    timeframe: {
        type: String,
        enum: ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'],
        required: true
    },
    strategy: {
        type: String,
        enum: ['MA_Crossover', 'RSI', 'MACD'],
        required: true
    },
    strategyParams: strategyParamsSchema,

    // Risk management (existing risk parameters)
    riskParams: riskParamsSchema,

    // Market Information (includes the latest candle data)
    marketInfo: marketInfoSchema,

    // Trade Information (includes TP/SL, leverage, sizing, etc.)
    tradeInfo: tradeInfoSchema,

    // Additional fields from the bot map
    userId: { type: Schema.Types.ObjectId, ref: 'User' }, // Link to a user (if applicable)
    botType: { type: String, enum: ['hedge', 'single'] },
    fundMode: { type: String, enum: ['isolated', 'cross'] },
    userLevel: { type: Number, default: 1 },

    // Operational flags and settings
    active: { type: Boolean, default: false },
    mode: { type: String, enum: ['live', 'paper'], default: 'paper' },
    paperBalance: { type: Number, default: 10000 }
}, { timestamps: true });

// Create a compound index to prevent duplicate entries for the same symbol, timeframe, and timestamp (if applicable).
// (For bots, you may have a unique key on _id or other fields; adjust as needed.)
botSchema.index({ symbol: 1, timeframe: 1 }, { unique: false });

module.exports = mongoose.model('Bot', botSchema);
