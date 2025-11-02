// Represents the "lastCandle" object
interface Candle {
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

// Represents the "currentCandle" object
interface CurrentCandle {
    price: number;
}

// Represents the "riskParams" object
interface RiskParams {
    positionSizingMethod: string;
}

// Represents the "marketInfo" object
interface MarketInfo {
    state: string;
    baseFund: number;
    tradeFund: number;
    lastSignal: string;
    currentCandle: CurrentCandle;
    lastCandle: Candle;
}

// Represents the "tradeInfo" object
interface TradeInfo {
    takeProfit: number;
    stopLoss: number;
    leverageLong: number;
    leverageShort: number;
    positionSide: string;
}

// Represents an object in the "indicators" array
interface Indicator {
    name: string;
    timeframe: string;
}

// Represents the main object in the "data" array (a Bot)
interface Bot {
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
    indicators: Indicator[];
    strategy: string;
    createdAt: string;
    updatedAt: string;
    __v: number;
}

// Represents the top-level API response
interface AdminBotApiResponse {
    success: boolean;
    data: Bot[];
}
