exports.getIndicatorsList = async (req, res) => {
    res.json({
        success: true,
        data: [
            'RSI',
            'MA_Crossover',
            'MACD',
            'Donchian',
            'Volume',
            'Heikin_Ashi',
            'Combined_RSI_MACD',
            'Bollinger_Bands',
            'Stochastic_RSI',
        ]
    })
}
