/**
 * Defines the structure for a single market mover item.
 * This corresponds to an individual asset in the gainers, losers,
 * or volatility scatter lists.
 */
export interface MoverItem {
    asset: string;      // Ticker symbol, e.g., "WLFI"
    change: number;     // 24-hour percentage change, e.g., 27.11538
    volume: number;     // 24-hour trading volume in USD, e.g., 1336804878
    rVol: number;       // Relative volume, e.g., 2.0385
    sparkline: number[];// An array of numbers for the 7-day trendline chart
}

/**
 * Defines the primary data structure for the market movers endpoint.
 * This is the main object returned by the `/api/market/movers` call.
 */
export interface MoversData {
    gainers: MoverItem[];           // Array of the top gaining assets
    losers: MoverItem[];            // Array of the top losing assets
    volatilityScatter: MoverItem[]; // Array of assets for the volatility scatter plot
}

/**
 * Defines the top-level API response structure.
 * It includes the main data payload and a success flag.
 */
export interface MarketMoversResponse {
    data: MoversData;
    success: boolean;
    error: string;
}
