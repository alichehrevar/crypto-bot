export interface Bot {
    id: string;
    name: string;
    symbol: string;
    timeframe: string;
    strategy: 'RSI' | 'MA_Crossover';
    active: boolean;
    createdAt: Date;
}

export interface Candle {
    timestamp: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    timeframe: string;
    symbol: string;
}

export interface User {
    id: string;
    email: string;
    createdAt: Date;
}
