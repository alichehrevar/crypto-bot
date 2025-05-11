export type DefaultBotConfigForm = {
  name: string;
  accountId: string;
  symbol: string;
  baseFund: number;
  tradeFund: number;
  leverage: number;
  riskStrategy: string;
  compoundPositionSizing: boolean;
  takeProfit: number;
  stopLoss: number;
  indicator: string;
  timeframe: string;
  additionalIndicators: Array<{ indicator: string; timeframe: string }>;
  strategy: string;
  strategyParams: object;
}
