export interface Token {
    symbol: string;
    color: string;
    label?: string; // For text based tokens like +3
}

export interface PortfolioData {
    name: string;
    version: string;
    rank: number;
    portfolioValue: number;
    totalReturnPercent: number;
    equity: number;
    sharpeRatio: number;
    totalTrades: number;
    winRate: number;
    tokens: Token[];
}
