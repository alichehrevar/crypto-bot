interface UpcomingListing {
    date: string;
    asset: string;
    type: string;
    exchange: string;
}

interface RecentLaunch {
    asset: string;
    launchDate: string;
    launchPrice: number;
    currentPrice: number;
    velocity: 'Low' | 'Medium' | 'High' | 'Very High';
}

export interface ListingsData {
    upcoming: UpcomingListing[];
    recent: RecentLaunch[];
}

export interface UpcomingListingResponse {
    success: boolean;
    data: ListingsData;
    error: string;
}
