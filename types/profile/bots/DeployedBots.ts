export type Indicator = {
  // Define based on actual structure if known, here's a placeholder:
  [key: string]: any;
};

export type Candle = {
  [key: string]: any; // Replace with exact fields like `open`, `close`, `high`, `low`, etc.
};

export type MarketInfo = {
  lastCandle: Candle;
  currentCandle: Candle;
  state: string;
  lastSignal: string;
  baseFund: number;
  tradeFund: number;
  [key: string]: any;
};

export type TradeInfo = {
  takeProfit: number;
  stopLoss: number;
  leverage: number;
};

export type Trade = {
  bot: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  symbol: string;
  timestamp: string;
  profit: number;
  type: 'BUY' | 'SELL';
  __v: number;
  _id: string;
};

export type Bot = {
  _id: string;
  name: string;
  active: boolean;
  botTP: number;
  botSL: number;
  cumulativePnL: number;
  createdAt: string;
  updatedAt: string;
  mode: string;
  userId: string;
  userLevel: number;
  symbol: string;
  timeframe: string;
  indicators: Indicator[];
  marketInfo: MarketInfo;
  tradeInfo: TradeInfo;
  trades: Trade[] | [];
  paperBalance: number;
  pnl: {
    pct: number;
    realized: number;
    unrealized: number;
    total: number;
  }
  accountType: string;
  strategy: string;
  riskStrategy: string;
  __v: number;
};

export type DeployedBotsResponse = {
  success: boolean,
  bots: Bot[],
  error: string
}

export type CloseTradeResponse = {
  success: boolean,
  error: string,
  trade: Trade
}
