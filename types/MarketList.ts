// Defines the structure for a single item in the market list array
export type MarketListItem = {
    id: number;
    symbol: string;
    category: 'Spot' | 'USDT-M' | 'New Listing';
    broker: 'Binance' | 'OKX' | 'Bybit' | 'BingX' | 'Other';
    volume: number;
    lastPrice: number;
    dailyChange: number;
    isFavorite: boolean;
};

// Defines the structure for the entire API response from the getMarketList endpoint
export type MarketListResponse = {
    data: MarketListItem[];
    success: boolean;
    message?: string; // Optional message property for errors
};
