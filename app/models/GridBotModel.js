// app/models/GridBotModel.js

const BotBase = require('./BotBase');
const { Schema } = require('mongoose');

/**
 * gridConfig – parameters specifically for a grid strategy
 */
const gridConfigSchema = new Schema({
    lowerPrice:          { type: Number, required: true },
    upperPrice:          { type: Number, required: true },
    gridCount:           { type: Number, required: true, min: 1 },
    gridType:            { type: String, enum: ['fixed','percentage','infinite'], default: 'fixed' },
    gridStepPercentage:  { type: Number, default: 0.01 },
    takeProfitPct:       { type: Number, default: 2 },
    stopLossPct:         { type: Number, default: 2 },
    volatilityBasedSL:   { type: Boolean, default: false },
    trailingStop:        { type: Boolean, default: true },
    ATRMultiplier:       { type: Number, default: 3 }
}, {
    _id: false,
    // ensure lower < upper
    validate: [
        v => v.lowerPrice < v.upperPrice,
        "lowerPrice must be less than upperPrice"
    ]
});

const gridBotSchema = new Schema({
    gridConfig: {
        type: gridConfigSchema,
        required: true
    }
});

module.exports = BotBase.discriminator('grid', gridBotSchema);
