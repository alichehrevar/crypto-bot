'use client';

import React from 'react';

// =====================================================================
// --- TYPE DEFINITIONS ---
// =====================================================================

interface RecentListing {
    asset: string;
    launchDate: string;
    launchPrice: number;
    currentPrice: number;
    velocity: string;
}

export interface PerformanceTrackerData {
    recent: RecentListing[];
}

// =====================================================================
// --- REUSABLE SUB-COMPONENTS ---
// =====================================================================

const GlossaryTerm: React.FC<{ term: string }> = ({ term }) => (
    <span className="relative cursor-default border-b border-dashed border-blue-500 group">
        {term}
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-gray-800/90 backdrop-blur-md text-white text-xs font-normal normal-case leading-normal p-3 rounded-md border border-white/10 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            Return on investment measures the profitability of an investment as a percentage of the original cost.
        </span>
    </span>
);

// =====================================================================
// --- MAIN COMPONENT ---
// =====================================================================

const LaunchPerformanceTracker: React.FC<{ data: PerformanceTrackerData | null }> = ({ data }) => {

    if (!data) {
        return (
            <div className="bg-dark-gray rounded-xl p-6 border border-white/5 shadow-md min-h-[300px] flex items-center justify-center">
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div className="p-6 shadow-md flex flex-col h-full">
            <h3 className="text-lg font-semibold text-white m-0 mb-4">Launch Performance Tracker</h3>
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                    <thead>
                    <tr>
                        {['Asset', 'Launch Date', 'Launch Price', 'Current Price', 'ROI (%)', 'Velocity'].map(h => (
                            <th key={h} className="p-3 border-b border-white/10 text-left font-medium text-gray-400 text-xs">
                                {h === 'ROI (%)' ? <GlossaryTerm term="ROI" /> : h}
                            </th>
                        ))}
                    </tr>
                    </thead>
                    <tbody>
                    {data.recent.map(item => {
                        const roi = ((item.currentPrice - item.launchPrice) / item.launchPrice) * 100;

                        return (
                            <tr key={item.asset} className="hover:bg-white/5 transition-colors">
                                <td className="p-3 border-b border-white/10 font-semibold text-white">{item.asset}</td>
                                <td className="p-3 border-b border-white/10">{item.launchDate.replace(/-/g, '.')}</td>
                                <td className="p-3 border-b border-white/10">${item.launchPrice.toFixed(2)}</td>
                                <td className="p-3 border-b border-white/10">${item.currentPrice.toFixed(2)}</td>
                                <td className={`p-3 border-b border-white/10 font-medium ${roi >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {roi.toFixed(2)}%
                                </td>
                                <td className="p-3 border-b border-white/10">{item.velocity}</td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LaunchPerformanceTracker;
