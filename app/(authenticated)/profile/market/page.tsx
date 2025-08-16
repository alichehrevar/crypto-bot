'use client';

import React, { useMemo } from 'react';

import ComparativeSectorRotation from "@/components/shared/charts/ComparativeSectorRotation";
import SectorPerformanceRanking from "@/components/shared/charts/SectorPerformanceRanking";
import ExchangeNetFlowCard from "@/components/shared/charts/ExchangeNetFlowCard";

// =====================================================================
// --- TYPE DEFINITIONS ---
// =====================================================================

// Types for SectorPerformanceRanking
interface SectorPerformanceData {
    sector: string;
    performance1D: number;
}

interface SectorData {
    performance: SectorPerformanceData[];
}

// Types for ExchangeNetFlowCard
interface NetFlowHistoryItem {
    day: string;
    inflow: number;
    outflow: number;
    totalNetFlow: number;
    stablecoinFlow: number;
    exchangeFlow: number;
    txCount: number;
    sevenDayMA: number | null;
}

interface NetFlowsData {
    netFlows: {
        history: NetFlowHistoryItem[];
    };
}


// =====================================================================
// --- MOCK DATA GENERATION ---
// =====================================================================

const random = (min: number, max: number): number => Math.random() * (max - min) + min;

// Generator for SectorPerformanceRanking
const generateSectorsData = (): SectorData => {
    const sectors = ['DeFi 2.0', 'Layer 1 protocols', 'Layer 2 scaling', 'AI & big data', 'Gaming & metaverse', 'Infrastructure', 'Real world assets (RWA)'];
    const performance = sectors.map(sector => ({
        sector,
        performance1D: random(-4, 8),
    })).sort((a, b) => b.performance1D - a.performance1D);

    return { performance };
};

// Generator for ExchangeNetFlowCard
const generateLiquidityFlowsData = (): NetFlowsData => {
    const baseHistory = Array.from({ length: 17 }, (_, i) => {
        const date = new Date();

        date.setDate(date.getDate() - (16 - i));
        const inflow = random(100, 800);
        const outflow = random(100, 800) * -1;

        return {
            day: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            inflow,
            outflow,
            totalNetFlow: inflow + outflow,
            stablecoinFlow: random(-500, 500),
            exchangeFlow: random(-200, 200),
            txCount: Math.floor(random(2000, 20000)),
        };
    });

    const netFlowsHistory: NetFlowHistoryItem[] = baseHistory.map((item, index, arr) => {
        if (index < 6) return { ...item, sevenDayMA: null };
        const sevenDaySlice = arr.slice(index - 6, index + 1);
        const sum = sevenDaySlice.reduce((acc, curr) => acc + curr.totalNetFlow, 0);

        return { ...item, sevenDayMA: sum / 7 };
    }).slice(7);

    return { netFlows: { history: netFlowsHistory } };
};


// =====================================================================
// --- PAGE COMPONENT ---
// =====================================================================

export default function Page() {
    // Memoize data for each component
    const sectorsData = useMemo(() => generateSectorsData(), []);
    const netFlowData = useMemo(() => generateLiquidityFlowsData(), []);

    return (
        <div className="grid grid-cols-2 w-full gap-6 mt-8">
            {/* This component now spans both columns */}
            <div className="col-span-2">
                <ComparativeSectorRotation height={340} />
            </div>

            {/* These two components sit side-by-side below */}
            <SectorPerformanceRanking data={sectorsData} />
            <ExchangeNetFlowCard data={netFlowData} />
        </div>
    );
}
