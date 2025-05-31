// app/models/IndicatorBot.js

const BotBase = require('./BotBase');
const { Schema } = require('mongoose');

/**
 * schema for a bot that runs indicator‐based logic
 */
const indicatorBotSchema = new Schema({
    indicators: {
        type: [ BotBase.schema.path('indicators') ? BotBase.schema.path('indicators').schema : {} ],
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

// We reuse the sub‐schema defined in BotBase for indicators.
// But since BotBase did not create an explicit path for 'indicators',
// let’s embed indicatorConfigSchema directly here:

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
        type: BotBase.schema.path('indicators')
            ? BotBase.schema.path('indicators').schema.path('params').schema
            : require('./BotBase').schema.path('indicators.params'),
        default: () => ({})
    }
}, { _id: false });

// Re‐attach the correct sub‐schema if needed:
indicatorBotSchema.path('indicators').schema = indicatorConfigSchema;

module.exports = BotBase.discriminator('indicator', indicatorBotSchema);
