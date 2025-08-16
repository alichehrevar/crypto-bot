'use client';

import React, { useMemo } from 'react';

import ComparativeSectorRotation from "@/components/shared/charts/ComparativeSectorRotation";
import SectorPerformanceRanking from "@/components/shared/charts/SectorPerformanceRanking";

interface SectorPerformanceData {
    sector: string;
    performance1D: number;
}

interface SectorData {
    performance: SectorPerformanceData[];
}

const random = (min: number, max: number): number => Math.random() * (max - min) + min;

const generateSectorsData = (): SectorData => {
    const sectors = ['DeFi 2.0', 'Layer 1 protocols', 'Layer 2 scaling', 'AI & big data', 'Gaming & metaverse', 'Infrastructure', 'Real world assets (RWA)'];
    const performance = sectors.map(sector => ({
        sector,
        performance1D: random(-4, 8),
    })).sort((a, b) => b.performance1D - a.performance1D);

    return { performance };
};

export default function Page() {
    const sectorsData = useMemo(() => generateSectorsData(), []);

    return (
        <div className="grid grid-cols-2 w-full gap-4 mt-8">
            <ComparativeSectorRotation height={340} />
            <SectorPerformanceRanking data={sectorsData} />
        </div>
    );
}
