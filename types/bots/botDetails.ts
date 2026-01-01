// 1. Shared / Utility Types
type Timeframe = '1m' | '3m' | '5m' | '15m' | '1h' | '4h' | '1d'; // Expand as needed
type TradeSignal = 'HOLD' | 'BUY' | 'SELL';
type BotState = 'active' | 'inactive' | 'error';
type AccountType = 'bingx' | 'binance' | 'bybit'; // Expand based on brokers you use

// 2. Nested Object Interfaces

export interface RiskParams {
    positionSizingMethod: string; // e.g., 'simple', 'kelly', 'fixed'
}

export interface CurrentCandle {
    price: number;
}

export interface CompletedCandle {
    timestamp: string; // ISO 8601
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface MarketInfo {
    state: BotState;
    baseFund: number;
    tradeFund: number;
    lastSignal: TradeSignal;
    currentCandle: CurrentCandle;
    lastCandle: CompletedCandle;
}

export interface TradeInfo {
    takeProfit: number;
    stopLoss: number;
    positionTakeProfit: number;
    positionStopLoss: number;
    leverageLong: number;
    leverageShort: number;
    positionSide: 'long' | 'short' | 'both';
}

export interface BotIndicator {
    name: string;
    timeframe: Timeframe;
}

// 3. Main Entity Interface

export interface TradingBot {
    _id: string; // MongoDB ObjectId
    name: string;
    symbol: string;
    timeframe: Timeframe;
    userId: string;
    botType: 'indicator' | 'strategy' | 'dca' | 'technical';

    // Strategy & Risk
    riskStrategy: string;
    riskParams: RiskParams;
    strategy: string;

    // Operational Data
    marketInfo: MarketInfo;
    tradeInfo: TradeInfo;
    indicators: BotIndicator[];

    // Settings
    positionMode: 'single' | 'hedge';
    fundMode: 'isolated' | 'cross';
    userLevel: number;
    active: boolean;
    mode: 'live' | 'paper';
    share: boolean;

    // Financials
    paperBalance: number;
    cumulativePnL: number;
    botTP: number; // Bot specific take profit trigger
    botSL: number; // Bot specific stop loss trigger

    // Account & Meta
    accountType: AccountType;
    accountId: string;
    createdAt: string;
    updatedAt: string;
    __v: number;
}

// @/types/bots/botDetails.ts

export interface GridConfig {
    lowerPrice: number;
    upperPrice: number;
    gridCount: number;
    gridType: 'fixed' | 'geometric'; // inferred from "fixed"
    gridStepPercentage: number;
    takeProfitPct: number;
    stopLossPct: number;
    volatilityBasedSL?: boolean;
    trailingStop?: boolean;
    ATRMultiplier?: number;
}

export interface GridMarketInfo {
    state: string; // 'inactive', 'active', etc.
    baseFund: number;
    tradeFund: number;
    lastSignal: string;
}

export interface GridTradeInfo {
    leverageLong: number;
    leverageShort: number;
}

export interface GridBot {
    _id: string;
    name: string;
    symbol: string;
    timeframe: string;
    userId: string;
    botType: 'grid'; // Discriminator
    riskStrategy: string;

    // Specific Grid Fields
    gridConfig: GridConfig;
    marketInfo: GridMarketInfo;
    tradeInfo: GridTradeInfo;

    // Standard Fields
    positionMode: string;
    fundMode: string;
    userLevel: number;
    active: boolean;
    mode: 'live' | 'paper' | 'backtest';
    paperBalance: number;
    cumulativePnL: number;
    botTP: number;
    botSL: number;
    share: boolean;
    accountType: string;
    accountId: string;
    indicators: any[]; // Empty in example, keeping generic
    createdAt: string;
    updatedAt: string;
    __v: number;
}

export interface DcaBot {
    _id: string;
    name: string;
    symbol: string;
    timeframe: string;
    userId: string;
    botType: 'dca'; // Discriminator
    riskStrategy: string;
    userLevel: number;
    active: boolean;
    mode: 'paper' | 'live' | 'backtest';
    paperBalance: number;
    cumulativePnL: number;
    botTP: number;
    botSL: number;
    share: boolean;
    accountType: string;
    accountId: string;

    // DCA Specific Fields
    status: string; // e.g. "DISABLED"
    marketType: string; // e.g. "SPOT"
    direction: string; // e.g. "LONG"
    activeDirection: string | null;
    leverage: number;
    baseOrderVolume: number;
    safetyOrderVolume: number;
    maxSafetyOrders: number;
    priceDeviation: number;
    volumeScale: number;
    stepScale: number;
    takeProfit: number;
    useMarketForEntry: boolean;
    activeDeal: boolean;
    enableTakeProfit: boolean;
    enableStopLoss: boolean;
    takeProfitPercent: number;
    stopLossPercent: number;
    trackTpWithAep: boolean;
    averageEntryPrice: number;
    totalVolume: number;
    positionContracts: number;
    completedDeals: number;
    terminateOnStopLoss: boolean;

    createdAt: string;
    updatedAt: string;
    indicators: unknown[]; // Using unknown instead of any for strictness
    __v: number;
}

export type TradingBotUnion = TradingBot | GridBot | DcaBot;

// 4. API Response Wrapper
export interface BotApiResponse {
    success: boolean;
    bot: TradingBot;
}
