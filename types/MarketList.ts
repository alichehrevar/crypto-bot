// Defines the structure for a single item in the market list array
export type MarketListItem = {
    id: string;
    symbol: string;
    category: 'Spot' | 'New Listing' | 'Perpetual';
    broker: 'Binance' | 'OKX' | 'Bybit' | 'BingX' | 'Other';
    volume: number;
    volume24h: number;
    lastPrice: number;
    dailyChange: number;
    isFavorite: boolean;

    // id: string;                 // e.g., 'bitcoin'
    // name: string;               // e.g., 'Bitcoin'
    // symbol: string;             // e.g., 'BTC'
    // imageUrl: string;           // The coin's logo URL
    // rank: number;               // Market cap rank
    //
    // // Quote Data
    // price: number;              // Current price
    // percent_change_24h: number; // 24h price change percentage
    // market_cap: number;         // Total market cap
    // total_volume: number;       // 24h trading volume
    //
    // // User-specific data (add as needed)
    // isFavorite: boolean;
    //
    // // Optional legacy fields if you still need them
    // broker?: string;
    // category?: string;
};

// Defines the structure for the entire API response from the getMarketList endpoint
export type MarketListResponse = {
    data: MarketListItem[];
    success: boolean;
    message?: string; // Optional message property for errors
};

export interface SortConfig {
    key: keyof MarketListItem | null;
    direction: 'ascending' | 'descending';
}
