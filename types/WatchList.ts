interface MarketData {
    _id: string;
    category: string;
    name: string;
    symbol: string;
    __v: number;
    change24h: number;
    createdAt: string; // Or Date
    last_updated: string; // Or Date
    price: number;
    rank: number;
    updatedAt: string; // Or Date
    volume24h: number;
}

export interface DataItem {
    _id: string;
    userId: string;
    symbol: string;
    broker: string;
    category: string;
    timestamp: string; // Or Date
    __v: number;
    marketData: MarketData;
}

export interface WatchListApiResponse {
    data: DataItem[];
    success: boolean;
    message: string;
}
