// Describes a single coin associated with an event
interface Coin {
    coinId: string;
    name: string;
    rank: number;
    symbol: string;
    fullname: string;
}

// Describes a category for an event
interface Category {
    categoryId: number;
    name: string;
}

// Describes a single upcoming or recent event
export interface CryptoEvent {
    _id: string;
    eventId: number;
    __v: number;
    can_occur_before: boolean;
    categories: Category[];
    coins: Coin[];
    createdAt: string;      // ISO 8601 date string, e.g., "2025-10-04T13:24:50.682Z"
    created_date: string;   // ISO 8601 date string
    currentPrice: number;
    date_event: string;     // ISO 8601 date string
    displayed_date: string; // Formatted date string, e.g., "05 Oct 2025"
    launchPrice: number;
    proof: string;          // URL string
    source: string;         // URL string
    title: string;
    updatedAt: string;      // ISO 8601 date string
    velocity: string;
}

// Describes the structure of the 'data' object
interface EventData {
    upcoming: CryptoEvent[];
    recent: CryptoEvent[];
}

// Describes the entire API response object
export interface ApiResponse {
    data: EventData;
    success: boolean;
    message: string;
}
