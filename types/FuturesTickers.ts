export type FuturesTicker = {
    symbol: string;
    lastPrice: string;
    priceChangePercent: string;
    volume: string;
};

export type Coin = {
    beta_value: number;
    first_data_at: string;
    id: string;
    last_updated: string;
    max_supply: number;
    name: string;
    quotes: {
        USD: {
            ath_date: string;
            ath_price: number;
            market_cap: number;
            market_cap_change_24h: number;
            percent_change_1h: number;
            percent_change_1y: number;
            percent_change_6h: number;
            percent_change_7d: number;
            percent_change_12h: number;
            percent_change_15m: number;
            percent_change_24h: number;
            percent_change_30d: number;
            percent_change_30m: number;
            percent_from_price_ath: number;
            price: number;
            volume_24h: number;
            volume_24h_change_24h: number;
        }
    };
    rank: number;
    symbol: string;
    total_supply: number;
}
