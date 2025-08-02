export type CoinSummaryData = {
    id: string;
    symbol: string;
    price: number;
    percent_change_24h: number;
    volume_24h: number;
    market_cap: number;
    last_updated: string;
    open: number;
    high: number;
    low: number;
    close: number;
    week52_high: number | null;
    week52_low: number | null;
};

export type CoinSummaryResponse = {
    data: CoinSummaryData;
    status: boolean;
    error: string;
}
