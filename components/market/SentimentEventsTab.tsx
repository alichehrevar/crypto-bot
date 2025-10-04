import React, {useEffect, useState} from "react";

import UpcomingListings from "@/components/shared/charts/UpcomingListings";
import LaunchPerformanceTracker, {PerformanceTrackerData} from "@/components/shared/charts/LaunchPerformanceTracker";
import TrendingTopicsTable, {TrendingTopicsData} from "@/components/shared/charts/TrendingTopicsTable";
import EventCalendar from "@/components/shared/charts/EventCalendar";

// =====================================================================
// --- TYPE DEFINITIONS ---
// =====================================================================
type TopicSeed = { text: string; sentiment: 'Positive' | 'Negative' | 'Neutral'; linkedAssets: string[]; socialMedia: string; };

// =====================================================================
// --- MOCK DATA GENERATION ---
// =====================================================================
const random = (min: number, max: number): number => Math.random() * (max - min) + min;

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

    const [trendingTopicsData, setTrendingTopicsData] = useState<TrendingTopicsData | null>(null);

    useEffect(() => {
        setTrendingTopicsData(generateTrendingTopicsData());
    }, []);

    return (
        <>
            <EventCalendar />
            <UpcomingListings />
            <TrendingTopicsTable data={trendingTopicsData} />
        </>
    )
}
