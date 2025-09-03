export type CoinSummaryData = {
    id: string,
    name: string,
    symbol: string,
    price: number,
    volume_24h: number,
    market_cap: number,
    last_updated: string,
    percent_change_24h: number,
    percent_change_7d: number,
    percent_change_30d: number,
    percent_change_1y: number,
    high_24h: number,
    low_24h: number,
    high_1w: number,
    low_1w: number,
    ath: number,
    imageUrl: string,
};

export type CoinSummaryResponse = {
    data: CoinSummaryData;
    status: boolean;
    error: string;
}
