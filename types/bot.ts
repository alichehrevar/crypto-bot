export interface Trade {
    type: 'buy' | 'sell';
    price: number;
    pnl: number;
    time: string;
}

export interface Bot {
    id: number;
    name: string;
    pair: string;
    leverage: string;
    runtime: string;
    transactions: number;
    successRate: number;
    pnlPerc: number;
    pnlValue: number;
    status: 'active' | 'paused';
    strategy: string;
    initialCapital: number;
    avgHoldTime: string;
    deploymentDate: string;
    winRate: number;
    sharpeRatio: number;
    lastSignalAction: string;
    marketType: 'Future' | 'Spot';
    marginType: 'Cross' | 'Isolated' | null;
    positionMode: 'Hedge' | 'Single' | null;
    tp: number | null;
    sl: number | null;
    trades: Trade[];
    isNew?: boolean;
    isExpanded?: boolean;
    isDeleting?: boolean;
}
