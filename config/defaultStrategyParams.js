// config/defaultStrategyParams.js

module.exports = {
    RSI:               { period: 14, overbought: 70, oversold: 30 },
    MACD:              { shortPeriod: 12, longPeriod: 26, signalPeriod: 9 },
    MA_Crossover:      { shortPeriod: 5,  longPeriod: 20 },
    Donchian:          { period: 20 },
    Volume:            { period: 14 },
    Heikin_Ashi:       {},
    Combined_RSI_MACD: { parameters: { confirmation_window: 6 } },
    Bollinger_Bands:   { period: 20, stdDev: 2 },
    Stochastic_RSI:    { period: 14, kPeriod: 3, dPeriod: 3 },
};
