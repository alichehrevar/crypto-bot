// app/models/IndicatorBot.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

// 1) Bring in the shared sub‐schemas from BotBase (for reuse)
const BotBase = require('./BotBase');

// Extract the shared strategyParamsSchema (used for indicator parameters)
const strategyParamsSchema = BotBase.schema.path('tradeInfo')
    ? BotBase.schema.path('indicators')?.schema.path('params')?.schema
    : null;

// If BotBase did not define strategyParamsSchema, define it here manually:
const defaultStrategyParamsSchema = new Schema({
    shortPeriod: { type: Number, min: 1 },
    longPeriod:  { type: Number, min: 1 },
    period:      { type: Number, min: 1 },
    overbought:  { type: Number },
    oversold:    { type: Number }
}, { _id: false });

// 2) Define the indicatorConfigSchema directly in this file:
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
        // Use the shared definition if available, otherwise fall back to our manually defined schema.
        type: strategyParamsSchema || defaultStrategyParamsSchema,
        default: () => ({})
    }
}, { _id: false });

// 3) Now define the discriminator schema for “indicator” bots
const indicatorBotSchema = new Schema({
    indicators: {
        type: [indicatorConfigSchema],
        required: true,
        validate: v => Array.isArray(v) && v.length > 0
    },
    strategy: {
        type: String,
        required: true,
        enum: ['default','optimized','dynamic'],
        default: 'default'
    }
});

// 4) Register the discriminator on BotBase
module.exports = BotBase.discriminator('indicator', indicatorBotSchema);
