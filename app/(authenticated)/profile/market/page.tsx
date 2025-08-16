'use client';

import React, { useState, useEffect } from 'react'; // Import useState and useEffect

import ComparativeSectorRotation from "@/components/shared/charts/ComparativeSectorRotation";
import SectorPerformanceRanking from "@/components/shared/charts/SectorPerformanceRanking";
import ExchangeNetFlowCard from "@/components/shared/charts/ExchangeNetFlowCard";
import EventCalendar, { CalendarData } from "@/components/shared/charts/EventCalendar";

// =====================================================================
// --- TYPE DEFINITIONS & MOCK DATA GENERATION ---
// (These helpers can remain unchanged)
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
            day: date.toLocaleString('en-US', { month: 'short', day: 'numeric' }),
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

// Generator for EventCalendar
const generateSentimentData = (): CalendarData => {
    return {
        events: [
            { date: '2025-08-08', time: '14:00 UTC', event: 'US Non-Farm Payrolls (July)', impact: 'High', forecast: '180k', actual: '205k', isPast: true },
            { date: '2025-08-12', time: '12:30 UTC', event: 'US CPI Data Release (July)', impact: 'High', forecast: '3.1%', actual: '3.2%', isPast: true },
            { date: '2025-08-16', time: '16:00 UTC', event: 'Ethereum "Pectra" Upgrade Spec', impact: 'Medium', forecast: 'N/A', actual: 'TBD' },
            { date: '2025-08-18', time: '10:00 UTC', event: 'Token Unlocks (APT)', impact: 'Low', forecast: '11.3M', actual: 'TBD' },
            { date: '2025-08-20', time: '18:00 UTC', event: 'FOMC Meeting Minutes', impact: 'High', forecast: 'N/A', actual: 'TBD' },
            { date: '2025-08-28', time: '18:30 UTC', event: 'US GDP Growth Rate (Q2 Final)', impact: 'Medium', forecast: '2.5%', actual: 'TBD' },
        ],
    };
};


// =====================================================================
// --- PAGE COMPONENT ---
// =====================================================================

export default function Page() {
    // [1] Initialize data states to null.
    const [sectorsData, setSectorsData] = useState<SectorData | null>(null);
    const [netFlowData, setNetFlowData] = useState<NetFlowsData | null>(null);
    const [calendarData, setCalendarData] = useState<CalendarData | null>(null);

    // [2] Generate data on the client *after* the component has mounted.
    useEffect(() => {
        // This block only runs on the client, ensuring no mismatch.
        setSectorsData(generateSectorsData());
        setNetFlowData(generateLiquidityFlowsData());
        setCalendarData(generateSentimentData());
    }, []); // The empty array [] ensures this effect runs only once.

    return (
        <div className="grid grid-cols-2 w-full gap-6 mt-8">
            <ComparativeSectorRotation height={340} />
            <SectorPerformanceRanking data={sectorsData} />
            <ExchangeNetFlowCard data={netFlowData} />
            <EventCalendar data={calendarData} />
        </div>
    );
}
