/**
 * Represents a single data point for the chart.
 */
export interface ChartDataItem {
    date: string;
    value: number | string;
}

/**
 * Represents an array of data points to be rendered by the chart.
 */
export type ChartData = ChartDataItem[];

/**
 * Represents the full data structure for the tabbed chart component,
 * mapping bot names to their respective chart data arrays.
 */
export interface ChartDataSets {
    [key: string]: ChartData;
}
