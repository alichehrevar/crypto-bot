import React, {useEffect, useState} from "react";

import UpcomingListings from "@/components/shared/charts/UpcomingListings";
import LaunchPerformanceTracker, {PerformanceTrackerData} from "@/components/shared/charts/LaunchPerformanceTracker";
import TrendingTopicsTable, {TrendingTopicsData} from "@/components/shared/charts/TrendingTopicsTable";
import EventCalendar from "@/components/shared/charts/EventCalendar";

// =====================================================================
// --- TYPE DEFINITIONS ---
// =====================================================================
interface NewListingsData { upcoming: { date: string; asset: string; type: string; exchange: string; }[]; recent: PerformanceTrackerData['recent']; }
type TopicSeed = { text: string; sentiment: 'Positive' | 'Negative' | 'Neutral'; linkedAssets: string[]; socialMedia: string; };

// =====================================================================
// --- MOCK DATA GENERATION ---
// =====================================================================
const random = (min: number, max: number): number => Math.random() * (max - min) + min;

const generateNewListingsData = (): NewListingsData => ({ upcoming: [{ date: '2025-08-18 12:00 UTC', asset: 'ZKSync (ZK)', type: 'Token Generation Event (TGE)', exchange: 'Multiple' },{ date: '2025-08-22 14:00 UTC', asset: 'LayerZero (ZRO)', type: 'Listing', exchange: 'Binance, Coinbase' },{ date: '2025-09-01 10:00 UTC', asset: 'Blast L2 (BLAST)', type: 'Airdrop Claim Opens', exchange: 'N/A' },], recent: [{ asset: 'Wormhole (W)', launchDate: '2025-07-10', launchPrice: 1.25, currentPrice: 0.95, velocity: 'Medium' },{ asset: 'Ethena (ENA)', launchDate: '2025-07-15', launchPrice: 0.60, currentPrice: 1.80, velocity: 'Very High' },{ asset: 'Tensor (TNSR)', launchDate: '2025-08-01', launchPrice: 1.50, currentPrice: 1.65, velocity: 'High' },]});

const generateTrendingTopicsData = (): TrendingTopicsData => {
    const topics: TopicSeed[] = [{ text: 'AI Hype Cycle', sentiment: 'Positive', linkedAssets: ['RNDR', 'FET'], socialMedia: 'X (Twitter)' },{ text: 'ETF Inflows', sentiment: 'Positive', linkedAssets: ['BTC', 'ETH'], socialMedia: 'Reddit' },{ text: 'Inflation Data', sentiment: 'Negative', linkedAssets: ['SPY', 'TLT'], socialMedia: 'X (Twitter)' },{ text: 'Geopolitical Risk', sentiment: 'Negative', linkedAssets: ['GOLD'], socialMedia: 'Telegram' },{ text: 'RWA Tokenization', sentiment: 'Neutral', linkedAssets: ['ONDO', 'LINK'], socialMedia: 'Reddit' },{ text: 'SEC Lawsuits', sentiment: 'Negative', linkedAssets: ['XRP', 'COIN'], socialMedia: 'X (Twitter)' },];

    return { trendingTopics: topics.map(topic => { const sparkline = []; let lastMention = random(500, 2000);

            for (let i = 0; i < 30; i++) { lastMention += random(-100, 100); sparkline.push({ day: i, mentions: Math.max(0, lastMention) }); }

            return { ...topic, mentionChange: random(-20, 50), zScore: random(-1.5, 3.5), sparkline }; }) };
};

// =====================================================================
// --- PAGE COMPONENT ---
// =====================================================================
export default function SentimentEventsTab() {

    const [listingsData, setListingsData] = useState<NewListingsData | null>(null);
    const [trendingTopicsData, setTrendingTopicsData] = useState<TrendingTopicsData | null>(null);

    useEffect(() => {
        setListingsData(generateNewListingsData());
        setTrendingTopicsData(generateTrendingTopicsData());
    }, []);

    return (
        <>
            <EventCalendar />
            <UpcomingListings />
            <LaunchPerformanceTracker data={listingsData} />
            <TrendingTopicsTable data={trendingTopicsData} />
        </>
    )
}
