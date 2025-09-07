export type SectorsPerformanceResponse = {
    data: {
        performance: SectorPerformanceData[];
    },
    success: boolean,
    error: string
}


export type SectorPerformanceData = {
    sector: string;
    performance1D: number;
}

export type SectorData = {
    performance: SectorPerformanceData[];
}

export type TooltipState = {
    visible: boolean;
    content: string;
    anchorRect: DOMRect | null;
}
