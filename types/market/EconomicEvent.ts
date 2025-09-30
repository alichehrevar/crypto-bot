// types/market/EconomicEvent.ts

type EventCoin = {
    symbol: string;
    name: string;
};

type EventCategory = {
    id: number;
    name: string;
};

/**
 * Represents a single economic calendar event.
 */
export interface EconomicEvent {
    // --- Core Identifiers ---
    id: number;          // Unique numeric ID for the event
    title: string;       // The event title (extracted from the 'en' property on the backend)

    // --- Relational Data ---
    coins: EventCoin[];      // Array of coins related to the event
    categories: EventCategory[]; // Array of categories for the event

    // --- Date & Time ---
    dateUtc: string;     // The main UTC timestamp added by the backend (ISO 8601 format)
    date_event: string;  // The original event date string from the API
    created_date: string;// When the event was added to the calendar
    displayed_date: string; // A user-friendly date string like "Q3 2025"

    // --- Additional Info & Links ---
    source: string;      // URL to the event source on CoinMarketCal
    proof: string;       // URL to the image proof for the event
    can_occur_before: boolean; // Flag indicating if the event can happen before the specified date

    // This property from the API has a non-standard name and must be quoted
    "-": string;
}

/**
 * Represents the structure of the API response for economic events.
 */
export interface EconomicEventsApiResponse {
    data: EconomicEvent[];
    success: boolean;
    error: string;
}
