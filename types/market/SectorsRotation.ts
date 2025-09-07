export interface SectorDataPoint {
    day: string;
    [sector: string]: number | string; // Allows any other string key to have a number or string value
}

// Type for the entire API response
export interface SectorApiResponse {
    data: SectorDataPoint[];
    success: boolean;
    error: string;
}
