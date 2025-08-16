'use client';

import React, { useState, useEffect } from 'react';

import ComparativeSectorRotation from "@/components/shared/charts/ComparativeSectorRotation";
import SectorPerformanceRanking from "@/components/shared/charts/SectorPerformanceRanking";
import ExchangeNetFlowCard from "@/components/shared/charts/ExchangeNetFlowCard";
import EventCalendar, { CalendarData } from "@/components/shared/charts/EventCalendar";
import UpcomingListings, { ListingsData } from '@/components/shared/charts/UpcomingListings';
import LaunchPerformanceTracker, { PerformanceTrackerData } from '@/components/shared/charts/LaunchPerformanceTracker';

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

// Combined type for new listings data
interface NewListingsData {
    upcoming: ListingsData['upcoming'];
    recent: PerformanceTrackerData['recent'];
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

// Generator for Listings Components
const generateNewListingsData = (): NewListingsData => ({
    upcoming: [
        { date: '2025-08-18 12:00 UTC', asset: 'ZKSync (ZK)', type: 'Token Generation Event (TGE)', exchange: 'Multiple' },
        { date: '2025-08-22 14:00 UTC', asset: 'LayerZero (ZRO)', type: 'Listing', exchange: 'Binance, Coinbase' },
        { date: '2025-09-01 10:00 UTC', asset: 'Blast L2 (BLAST)', type: 'Airdrop Claim Opens', exchange: 'N/A' },
    ],
    recent: [
        { asset: 'Wormhole (W)', launchDate: '2025-07-10', launchPrice: 1.25, currentPrice: 0.95, velocity: 'Medium' },
        { asset: 'Ethena (ENA)', launchDate: '2025-07-15', launchPrice: 0.60, currentPrice: 1.80, velocity: 'Very High' },
        { asset: 'Tensor (TNSR)', launchDate: '2025-08-01', launchPrice: 1.50, currentPrice: 1.65, velocity: 'High' },
    ]
});


// =====================================================================
// --- PAGE COMPONENT ---
// =====================================================================

export default function Page() {
    const [sectorsData, setSectorsData] = useState<SectorData | null>(null);
    const [netFlowData, setNetFlowData] = useState<NetFlowsData | null>(null);
    const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
    const [listingsData, setListingsData] = useState<NewListingsData | null>(null);

    useEffect(() => {
        setSectorsData(generateSectorsData());
        setNetFlowData(generateLiquidityFlowsData());
        setCalendarData(generateSentimentData());
        setListingsData(generateNewListingsData());
    }, []);

    return (
        <div className="grid grid-cols-2 w-full px-2 lg:px-4 gap-6 mt-8">
            <UpcomingListings data={listingsData} />
            <LaunchPerformanceTracker data={listingsData} />
            <ComparativeSectorRotation height={340} />
            <SectorPerformanceRanking data={sectorsData} />
            <ExchangeNetFlowCard data={netFlowData} />
            <EventCalendar data={calendarData} />
        </div>
    );
}
