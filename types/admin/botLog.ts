export interface BotLog {
    _id: string;
    timestamp: string;
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
    // 'meta' can contain anything, especially generic metadata from winston
    meta?: any;
}

export interface LogPagination {
    totalLogs: number;
    totalPages: number;
    currentPage: number;
    limit: number;
}

export interface LogApiResponse {
    success: boolean;
    data: {
        logs: BotLog[];
        pagination: LogPagination;
    }
}
