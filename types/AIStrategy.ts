export interface StrategyReport {
    overview: string;
    strategy: { component: string; indicator: string; }[];
    execution: string;
}

export interface GeneratedStrategy {
    code: string;
    report: StrategyReport;
    metadata: { name: string; };
}
