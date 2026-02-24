export interface IndicatorSettings {
    RSI: { period: number; overbought: number; oversold: number };
    MACD: { shortPeriod: number; longPeriod: number; signalPeriod: number };
    Bollinger_Bands: { period: number; stdDevMultiplier: number };
    Donchian: { period: number; offset: number };
    SmoothedHeikinAshi: { emaPeriod1: number; emaPeriod2: number };
    SMA: { period: number };
    ATR: { period: number };
    Stochastic_RSI: { period: number; kPeriod: number; dPeriod: number };
    MA_Crossover: { shortPeriod: number; longPeriod: number };
}

export interface indicatorSettingsResponse {
    success: boolean,
    message: string,
    error: string
}
