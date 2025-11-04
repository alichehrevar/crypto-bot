export interface RiskParams {
    positionSizingMethod: string;
}

export interface CurrentCandle {
    price: number;
}

export interface LastCandle {
    timestamp: string; // ISO Date string
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface MarketInfo {
    state: string;
    baseFund: number;
    tradeFund: number;
    lastSignal: string;
    currentCandle: CurrentCandle;
    lastCandle: LastCandle;
}

export interface TradeInfo {
    takeProfit: number;
    stopLoss: number;
    leverageLong: number;
    leverageShort: number;
    positionSide: string;
}

export interface BotIndicator {
    name: string;
    timeframe: string;
}

export interface Pnl {
    realized: number;
    unrealized: number;
    total: number;
    pct: number;
}

export interface Trade {
    _id: string;
    bot: string;
    symbol: string;
    type: string;
    entryPrice: number;
    quantity: number;
    timestamp: string; // ISO Date string
    __v: number;
}

export interface Bot {
    _id: string;
    name: string;
    symbol: string;
    timeframe: string;
    userId: string;
    botType: string;
    riskStrategy: string;
    riskParams: RiskParams;
    marketInfo: MarketInfo;
    tradeInfo: TradeInfo;
    positionMode: string;
    fundMode: string;
    userLevel: number;
    active: boolean;
    mode: string;
    paperBalance: number;
    cumulativePnL: number;
    botTP: number;
    botSL: number;
    share: boolean;
    accountType: string;
    accountId: string;
    indicators: BotIndicator[];
    strategy: string;
    createdAt: string; // ISO Date string
    updatedAt: string; // ISO Date string
    __v: number;
    pnl: Pnl;
    trades: Trade[];
}

export interface Bots {
    indicator: Bot[];
    grid: Bot[];
}

export interface BotApiResponse {
    success: boolean;
    bots: Bots;
}
