// 1. Individual Indicator Configurations
export interface RSIConfig {
    period: number;
    overbought: number;
    oversold: number;
}

export interface MACDConfig {
    shortPeriod: number;
    longPeriod: number;
    signalPeriod: number;
}

export interface MACrossoverConfig {
    shortPeriod: number;
    longPeriod: number;
}

export interface SimplePeriodConfig {
    period: number;
}

export type HeikinAshiConfig = Record<string, never>;

export interface BollingerBandsConfig {
    period: number;
    stdDev: number;
}

export interface StochasticRSIConfig {
    period: number;
    kPeriod: number;
    dPeriod: number;
}

export interface CombinedRSIMACDConfig {
    parameters: {
        confirmation_window: number;
    };
}

// 2. The Master Configuration Object
export interface StrategyConfig {
    RSI: RSIConfig;
    MACD: MACDConfig;
    MA_Crossover: MACrossoverConfig;
    Donchian: SimplePeriodConfig;
    Volume: SimplePeriodConfig;
    Heikin_Ashi: HeikinAshiConfig;
    Combined_RSI_MACD: CombinedRSIMACDConfig;
    Bollinger_Bands: BollingerBandsConfig;
    Stochastic_RSI: StochasticRSIConfig;
}
