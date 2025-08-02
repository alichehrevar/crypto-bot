export type MarketQuote = {
    price: number;
    volume_24h: number;
    market_cap: number;
    percent_change_1h: number;
    percent_change_24h: number;
    percent_change_7d: number;
};

export type MarketSnapshot = {
    _id: string;
    id: string; // e.g. "btc-bitcoin"
    name: string;
    symbol: string;
    rank: number;
    circulating_supply: number;
    total_supply: number;
    max_supply: number;
    beta_value: number;
    first_data_at: string;
    last_updated: string;
    quotes: {
        USD: MarketQuote;
        BTC: MarketQuote;
    };
    imageUrl: string;
    updatedAt: string;
    __v?: number;
};

export type MarketSnapshotResponse = {
    data: MarketSnapshot[];
    success: boolean;
    message: string;
}
