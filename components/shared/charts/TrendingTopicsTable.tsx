'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';
import { addToast, Spinner } from "@heroui/react";
import { AlertCircle } from 'lucide-react';

import { getData } from "@/actions/get";

// =====================================================================
// --- TYPE DEFINITIONS ---
// =====================================================================

interface SparklineData {
    day: number;
    mentions: number;
}

interface TrendingTopic {
    text: string;
    sentiment: 'Positive' | 'Negative' | 'Neutral';
    linkedAssets: string[];
    socialMedia: string;
    mentionChange: number;
    zScore: number;
    sparkline: SparklineData[];
}

interface TrendingTopicsResponse {
    trendingTopics: TrendingTopic[];
    error?: string;
}

// =====================================================================
// --- REUSABLE SUB-COMPONENTS ---
// =====================================================================

const glossary: Record<string, string> = {
    '30d z-score': 'A statistical measure that indicates how far a data point is from its 30-day average. A high z-score (>2) suggests a statistically significant deviation from the norm.',
};

const GlossaryTerm: React.FC<{ term: string }> = ({ term }) => (
    <span className="relative cursor-default border-b border-dashed border-blue-500 group">
        {term}
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-gray-800/90 backdrop-blur-md text-white text-xs font-normal normal-case leading-normal p-3 rounded-md border border-white/10 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            {glossary[term.toLowerCase()]}
        </span>
    </span>
);

const SentimentCell: React.FC<{ value: TrendingTopic['sentiment'] }> = ({ value }) => {
    const sentimentColor = {
        Positive: 'text-green-500',
        Negative: 'text-red-500',
        Neutral: 'text-gray-400',
    };

    return <span className={sentimentColor[value]}>{value}</span>;
};

// =====================================================================
// --- MAIN COMPONENT ---
// =====================================================================

const TrendingTopicsTable: React.FC = () => {
    const [trendingData, setTrendingData] = useState<TrendingTopicsResponse | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const loadTopics = useCallback(async () => {
        setIsLoading(true);
        try {
            // Fetching from the route specified
            const res: TrendingTopicsResponse = await getData('/sentiment/trending-topics');

            if (res && res.trendingTopics) {
                setTrendingData(res);
            } else {
                addToast({
                    title: res.error || "Failed to load trending topics",
                    color: "danger"
                });
            }
        } catch {
            addToast({ title: "Connection error", color: "danger" });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTopics();
    }, [loadTopics]);

    // --- RENDER HELPERS ---

    if (isLoading) {
        return (
            <div className="bg-[#1A1918] rounded-xl p-6 border border-[#333333] shadow-md min-h-[400px] flex flex-col items-center justify-center">
                <Spinner className="mb-3" color="primary" size="lg" />
                <span className="text-neutral-400 animate-pulse text-sm">Analyzing Social Data...</span>
            </div>
        );
    }

    if (!trendingData || trendingData.trendingTopics.length === 0) {
        return (
            <div className="bg-[#1A1918] rounded-xl p-6 border border-[#333333] shadow-md min-h-[400px] flex flex-col items-center justify-center">
                <AlertCircle className="w-10 h-10 text-neutral-600 mb-3" />
                <p className="text-neutral-400">No trending topics found at the moment.</p>
            </div>
        );
    }

    // --- MAIN RENDER ---

    return (
        <div className="ua-card p-6 shadow-md flex flex-col h-full ua-card rounded-xl">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white m-0">Social Trending Topics</h3>
                <div className="text-xs text-neutral-500">
                    Live Updates
                </div>
            </div>

            <div className="overflow-x-auto lg:overflow-x-hidden">
                <table className="w-full border-collapse text-sm">
                    <thead>
                    <tr>
                        {['Topic', 'Social Media', '24h Change', '30d z-score', 'Sentiment', 'Linked Assets', '30d Trend'].map(h => (
                            <th key={h} className="p-3 border-b border-white/10 text-left font-medium text-gray-400 text-xs capitalize whitespace-nowrap">
                                {h === '30d z-score' ? <GlossaryTerm term={h} /> : h}
                            </th>
                        ))}
                    </tr>
                    </thead>
                    <tbody>
                    {trendingData.trendingTopics.map((topic) => (
                        <tr key={topic.text} className="hover:bg-white/5 transition-colors group">
                            <td className="p-3 border-b border-white/10 font-semibold text-white">{topic.text}</td>
                            <td className="p-3 border-b border-white/10 text-neutral-300">{topic.socialMedia}</td>
                            <td className={`p-3 border-b border-white/10 font-medium ${topic.mentionChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {topic.mentionChange > 0 ? '+' : ''}{topic.mentionChange.toFixed(2)}%
                            </td>
                            <td className={`p-3 border-b border-white/10 font-medium ${Math.abs(topic.zScore) > 2 ? 'text-yellow-400' : 'text-neutral-300'}`}>
                                {topic.zScore.toFixed(2)}
                            </td>
                            <td className="p-3 border-b border-white/10">
                                <SentimentCell value={topic.sentiment} />
                            </td>
                            <td className="p-3 border-b border-white/10">
                                {topic.linkedAssets.map(asset => (
                                    <span key={asset} className="inline-block bg-[#333] text-white text-[10px] px-1.5 py-0.5 rounded mr-1">
                                        {asset}
                                    </span>
                                ))}
                            </td>
                            <td className="p-3 border-b border-white/10 min-w-[120px]">
                                <div className="h-[30px] w-[100px]">
                                    <ResponsiveContainer height="100%" width="100%">
                                        <LineChart data={topic.sparkline}>
                                            <Line
                                                dataKey="mentions"
                                                dot={false}
                                                isAnimationActive={false} // Performance optimization for tables
                                                stroke={topic.mentionChange >= 0 ? '#4CAF50' : '#F44336'}
                                                strokeWidth={2}
                                                type="monotone"
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TrendingTopicsTable;
