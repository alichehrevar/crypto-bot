/** A single backtest job returned from your API */
export interface ApiJob {
    _id: string;
    status: string;

    input: JobInput;
    backtest: BacktestResult;

    createdAt: string; // ISO string
    updatedAt?: string;

    // n8n-specific metadata
    finished: boolean;
    workflowId?: string;
    executionId?: string;
    owner?: OwnerInfo;

    // optional or undocumented fields
    responseStatus?: number;
    responseMessage?: string;
    responseError?: string;
}

export interface JobInput {
    experienceLevel: string;
    backtestSymbol: string;        // e.g. "BTCUSDT"
    backtestInterval: string;      // e.g. "1h", "5m"
    additionalInstructions?: string;
    asset?: string;
    timeframe?: string;
    prompt?: string;
}

/** Backtest data stored in Mongo and returned by API */
export interface BacktestResult {
    status: string;                // "Success" | "Failure"
    roi: string;                   // numeric string (e.g. "0.317" == 31.7%)
    winRatio?: string;
    lossRatio?: string;
    maxDrawdown?: string;

    fullBalanceSketch: string;     // raw SVG string
    debug?: BacktestDebugInfo;

    // output text from your AI strategy generator
    strategyResponse?: string;

    // optional fields used by some workflows
    pnl?: string;
    trades?: BacktestTrade[];
    notes?: string;
}

/** Debug information stored by n8n / backend */
export interface BacktestDebugInfo {
    totalTrades?: number;
    wins?: number;
    losses?: number;
    logs?: string[];
}

/** Single trade (if your backend includes them later) */
export interface BacktestTrade {
    timestamp: string;             // ISO
    price: number;
    side: "long" | "short";
    pnl: number;
    size?: number;
}

/** n8n internal owner field */
export interface OwnerInfo {
    type: string;
    userId?: string;
}

/** API wrapper response */
export interface ApiResponse {
    data: ApiJob[];
    success: boolean,
    message: string
}
