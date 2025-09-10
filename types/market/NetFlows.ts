interface NetFlowHistoryItem {
    _id: string,
    coinId: string,
    date: string,
    createdAt: string,
    day: string,
    exchangeFlow: number,
    inflow: number,
    outflow: number,
    sevenDayMA: number,
    stablecoinFlow: number,
    totalNetFlow: number,
    txCount: number,
    updatedAt: string,
}

export interface NetFlowsData {
    netFlows: {
        history: NetFlowHistoryItem[];
    };
}

/**
 * Describes the entire API response structure for net flows data.
 */
export type NetFlowsApiResponse = {
    data: NetFlowsData;
    success: boolean;
    error: string;
};
