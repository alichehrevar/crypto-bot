'use client';

import React, { useState, useEffect } from 'react';
import {Tab, Tabs} from "@heroui/react";

import ComparativeSectorRotation from "@/components/shared/charts/ComparativeSectorRotation";
import SectorPerformanceRanking from "@/components/shared/charts/SectorPerformanceRanking";
import ExchangeNetFlowCard from "@/components/shared/charts/ExchangeNetFlowCard";
import EventCalendar, { CalendarData } from "@/components/shared/charts/EventCalendar";
import UpcomingListings from '@/components/shared/charts/UpcomingListings';
import LaunchPerformanceTracker, { PerformanceTrackerData } from '@/components/shared/charts/LaunchPerformanceTracker';
import TrendingTopicsTable, { TrendingTopicsData } from '@/components/shared/charts/TrendingTopicsTable';
import MoversAndVolatility, { MoversData } from '@/components/shared/charts/MoversAndVolatility';

// =====================================================================
// --- TYPE DEFINITIONS ---
// =====================================================================
interface SectorData { performance: { sector: string; performance1D: number; }[]; }
interface NetFlowHistoryItem { day: string; inflow: number; outflow: number; totalNetFlow: number; stablecoinFlow: number; exchangeFlow: number; txCount: number; sevenDayMA: number | null; }
interface NetFlowsData { netFlows: { history: NetFlowHistoryItem[]; }; }
interface NewListingsData { upcoming: { date: string; asset: string; type: string; exchange: string; }[]; recent: PerformanceTrackerData['recent']; }
type TopicSeed = { text: string; sentiment: 'Positive' | 'Negative' | 'Neutral'; linkedAssets: string[]; socialMedia: string; };

// =====================================================================
// --- MOCK DATA GENERATION ---
// =====================================================================

const random = (min: number, max: number): number => Math.random() * (max - min) + min;

const generateSectorsData = (): SectorData => ({ performance: ['DeFi 2.0', 'Layer 1 protocols', 'Layer 2 scaling', 'AI & big data', 'Gaming & metaverse', 'Infrastructure', 'Real world assets (RWA)'].map(sector => ({ sector, performance1D: random(-4, 8) })).sort((a, b) => b.performance1D - a.performance1D) });

const generateLiquidityFlowsData = (): NetFlowsData => {
    const baseHistory = Array.from({ length: 17 }, (_, i) => { const date = new Date();

 date.setDate(date.getDate() - (16 - i)); const inflow = random(100, 800); const outflow = random(100, 800) * -1;

 return { day: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), inflow, outflow, totalNetFlow: inflow + outflow, stablecoinFlow: random(-500, 500), exchangeFlow: random(-200, 200), txCount: Math.floor(random(2000, 20000)), }; });
    const netFlowsHistory: NetFlowHistoryItem[] = baseHistory.map((item, index, arr) => { if (index < 6) return { ...item, sevenDayMA: null }; const sevenDaySlice = arr.slice(index - 6, index + 1); const sum = sevenDaySlice.reduce((acc, curr) => acc + curr.totalNetFlow, 0);

 return { ...item, sevenDayMA: sum / 7 }; }).slice(7);

    return { netFlows: { history: netFlowsHistory } };
};

const generateSentimentData = (): CalendarData => ({ events: [{ date: '2025-08-08', time: '14:00 UTC', event: 'US Non-Farm Payrolls (July)', impact: 'High', forecast: '180k', actual: '205k', isPast: true },{ date: '2025-08-12', time: '12:30 UTC', event: 'US CPI Data Release (July)', impact: 'High', forecast: '3.1%', actual: '3.2%', isPast: true },{ date: '2025-08-16', time: '16:00 UTC', event: 'Ethereum "Pectra" Upgrade Spec', impact: 'Medium', forecast: 'N/A', actual: 'TBD' },{ date: '2025-08-18', time: '10:00 UTC', event: 'Token Unlocks (APT)', impact: 'Low', forecast: '11.3M', actual: 'TBD' },{ date: '2025-08-20', time: '18:00 UTC', event: 'FOMC Meeting Minutes', impact: 'High', forecast: 'N/A', actual: 'TBD' },{ date: '2025-08-28', time: '18:30 UTC', event: 'US GDP Growth Rate (Q2 Final)', impact: 'Medium', forecast: '2.5%', actual: 'TBD' },]});

const generateNewListingsData = (): NewListingsData => ({ upcoming: [{ date: '2025-08-18 12:00 UTC', asset: 'ZKSync (ZK)', type: 'Token Generation Event (TGE)', exchange: 'Multiple' },{ date: '2025-08-22 14:00 UTC', asset: 'LayerZero (ZRO)', type: 'Listing', exchange: 'Binance, Coinbase' },{ date: '2025-09-01 10:00 UTC', asset: 'Blast L2 (BLAST)', type: 'Airdrop Claim Opens', exchange: 'N/A' },], recent: [{ asset: 'Wormhole (W)', launchDate: '2025-07-10', launchPrice: 1.25, currentPrice: 0.95, velocity: 'Medium' },{ asset: 'Ethena (ENA)', launchDate: '2025-07-15', launchPrice: 0.60, currentPrice: 1.80, velocity: 'Very High' },{ asset: 'Tensor (TNSR)', launchDate: '2025-08-01', launchPrice: 1.50, currentPrice: 1.65, velocity: 'High' },]});

const generateTrendingTopicsData = (): TrendingTopicsData => {
    const topics: TopicSeed[] = [{ text: 'AI Hype Cycle', sentiment: 'Positive', linkedAssets: ['RNDR', 'FET'], socialMedia: 'X (Twitter)' },{ text: 'ETF Inflows', sentiment: 'Positive', linkedAssets: ['BTC', 'ETH'], socialMedia: 'Reddit' },{ text: 'Inflation Data', sentiment: 'Negative', linkedAssets: ['SPY', 'TLT'], socialMedia: 'X (Twitter)' },{ text: 'Geopolitical Risk', sentiment: 'Negative', linkedAssets: ['GOLD'], socialMedia: 'Telegram' },{ text: 'RWA Tokenization', sentiment: 'Neutral', linkedAssets: ['ONDO', 'LINK'], socialMedia: 'Reddit' },{ text: 'SEC Lawsuits', sentiment: 'Negative', linkedAssets: ['XRP', 'COIN'], socialMedia: 'X (Twitter)' },];

    return { trendingTopics: topics.map(topic => { const sparkline = []; let lastMention = random(500, 2000);

 for (let i = 0; i < 30; i++) { lastMention += random(-100, 100); sparkline.push({ day: i, mentions: Math.max(0, lastMention) }); }

 return { ...topic, mentionChange: random(-20, 50), zScore: random(-1.5, 3.5), sparkline }; }) };
};

// Generator for MoversAndVolatility
const generateMoversData = (): MoversData => {
    const assets = ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'XRP', 'LINK', 'RNDR', 'FET', 'AGIX', 'GALA', 'MANA', 'SAND', 'AVAX', 'NEAR', 'ATOM', 'ICP', 'FTM', 'LTC', 'BCH'];
    const data = assets.map(asset => {
        const change = random(-15, 15); const volume = random(50e6, 2e9); const avgVolume = random(100e6, 1e9);
        let currentValue = 100; const sparkline = Array.from({ length: 24 }, () => { currentValue += random(-2, 2) + (change / 25);

 return currentValue; });

        return { asset, change, volume, rVol: volume / avgVolume, sparkline };
    });

    return {
        gainers: data.filter(d => d.change >= 0).sort((a, b) => b.change - a.change).slice(0, 10),
        losers: data.filter(d => d.change < 0).sort((a, b) => a.change - b.change).slice(0, 10),
        volatilityScatter: data,
    };
};

// =====================================================================
// --- PAGE COMPONENT ---
// =====================================================================

export default function Page() {
    const [sectorsData, setSectorsData] = useState<SectorData | null>(null);
    const [netFlowData, setNetFlowData] = useState<NetFlowsData | null>(null);
    const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
    const [listingsData, setListingsData] = useState<NewListingsData | null>(null);
    const [trendingTopicsData, setTrendingTopicsData] = useState<TrendingTopicsData | null>(null);
    const [moversData, setMoversData] = useState<MoversData | null>(null);

    useEffect(() => {
        setSectorsData(generateSectorsData());
        setNetFlowData(generateLiquidityFlowsData());
        setCalendarData(generateSentimentData());
        setListingsData(generateNewListingsData());
        setTrendingTopicsData(generateTrendingTopicsData());
        setMoversData(generateMoversData());
    }, []);

    return (
        <div className="container mx-auto px-2 lg:px-4 py-8">
            <Tabs
                aria-label="Tabs variants"
                classNames={{
                    base: 'w-full px-4',
                    tabList: 'w-full mx-auto border-b-1 border-default-100',
                    tab: 'h-10 pb-4 font-bold text-[14px]',
                    panel: "w-full grid grid-cols-1 gap-4 mt-4"
                }}
                variant="underlined"
            >
                <Tab key="momentum-rotation" title="Momentum & Rotation">
                    <MoversAndVolatility data={moversData} />
                    <SectorPerformanceRanking data={sectorsData} />
                    <ComparativeSectorRotation height={340} />
                </Tab>
                <Tab key="liquidity-flow" title="Liquidity & Flow">
                    <EventCalendar data={calendarData} />
                    <ExchangeNetFlowCard data={netFlowData} />
                </Tab>
                <Tab key="sentiment-events" title="Sentiment & Events">
                    <UpcomingListings data={listingsData} />
                    <LaunchPerformanceTracker data={listingsData} />
                    <TrendingTopicsTable data={trendingTopicsData} />
                </Tab>
            </Tabs>
        </div>
    );
}
