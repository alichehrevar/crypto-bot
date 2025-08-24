'use client';

import React from 'react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';

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

export interface TrendingTopicsData {
    trendingTopics: TrendingTopic[];
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

const TrendingTopicsTable: React.FC<{ data: TrendingTopicsData | null }> = ({ data }) => {

    if (!data) {
        return (
            <div className="bg-dark-gray rounded-xl p-6 border border-white/5 shadow-md min-h-[400px] flex items-center justify-center">
                <p>Loading Topics...</p>
            </div>
        );
    }

    return (
        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-white/5 shadow-md flex flex-col h-full">
            <h3 className="text-lg font-semibold text-white m-0 mb-4">Social Trending Topics</h3>
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                    <thead>
                    <tr>
                        {['Topic', 'Social Media', '24h Change', '30d z-score', 'Sentiment', 'Linked Assets', '30d Trend'].map(h => (
                            <th key={h} className="p-3 border-b border-white/10 text-left font-medium text-gray-400 text-xs capitalize">
                                {h === '30d z-score' ? <GlossaryTerm term={h} /> : h}
                            </th>
                        ))}
                    </tr>
                    </thead>
                    <tbody>
                    {data.trendingTopics.map((topic) => (
                        <tr key={topic.text} className="hover:bg-white/5 transition-colors">
                            <td className="p-3 border-b border-white/10 font-semibold text-white">{topic.text}</td>
                            <td className="p-3 border-b border-white/10">{topic.socialMedia}</td>
                            <td className={`p-3 border-b border-white/10 font-medium ${topic.mentionChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {topic.mentionChange.toFixed(2)}%
                            </td>
                            <td className={`p-3 border-b border-white/10 font-medium ${topic.zScore > 2 ? 'text-yellow-400' : ''}`}>
                                {topic.zScore.toFixed(2)}
                            </td>
                            <td className="p-3 border-b border-white/10">
                                <SentimentCell value={topic.sentiment} />
                            </td>
                            <td className="p-3 border-b border-white/10">{topic.linkedAssets.join(', ')}</td>
                            <td className="p-3 border-b border-white/10">
                                <ResponsiveContainer height={30} width={100}>
                                    <LineChart data={topic.sparkline}>
                                        <Line dataKey="mentions" dot={false} stroke={topic.mentionChange >= 0 ? '#4CAF50' : '#F44336'} strokeWidth={2} type="monotone" />
                                    </LineChart>
                                </ResponsiveContainer>
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
