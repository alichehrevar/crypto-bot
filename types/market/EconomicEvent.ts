// types/market/EconomicEvent.ts

/**
 * Defines the possible impact levels of a market event.
 */
export type EventImpact = "Low" | "Medium" | "High";

/**
 * Represents a single economic calendar event.
 */
export interface EconomicEvent {
    _id: string;
    sourceId: string;
    __v: number;
    actual: string;
    createdAt: string; // ISO 8601 date string
    date: string; // Format: "YYYY-MM-DD"
    event: string;
    forecast: string;
    impact: EventImpact;
    source: string;
    source_link: string;
    time: string;
    updatedAt: string; // ISO 8601 date string
    isPast: boolean;
}

/**
 * Represents the structure of the API response for economic events.
 */
export interface EconomicEventsApiResponse {
    data: EconomicEvent[];
    success: boolean;
    error: string;
}
