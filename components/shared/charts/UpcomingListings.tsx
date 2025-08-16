'use client';

import React from 'react';

// =====================================================================
// --- TYPE DEFINITIONS ---
// =====================================================================

interface UpcomingListing {
    date: string;
    asset: string;
    type: string;
    exchange: string;
}

export interface ListingsData {
    upcoming: UpcomingListing[];
}

// =====================================================================
// --- MAIN COMPONENT ---
// =====================================================================

const UpcomingListings: React.FC<{ data: ListingsData | null }> = ({ data }) => {

    if (!data) {
        return (
            <div className="bg-[#1a1a1a] rounded-xl p-6 border border-white/5 shadow-md min-h-[300px] flex items-center justify-center">
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-white/5 shadow-md flex flex-col h-full">
            <h3 className="text-lg font-semibold text-white m-0 mb-6">Upcoming Listings</h3>
            <div className="relative flex flex-col">
                {data.upcoming.map((item, index) => (
                    <div key={index} className="relative pl-8 pb-8 border-l-2 border-gray-700 last:border-transparent last:pb-0">
                        {/* Timeline Dot */}
                        <div className="absolute left-[-9px] top-0 w-4 h-4 bg-blue-500 rounded-full border-2 border-[#1a1a1a]" />
                        <p className="text-xs text-gray-400 mb-1">{item.date}</p>
                        <p className="font-semibold text-white">{item.asset}</p>
                        <p className="text-sm text-gray-300">
                            <span className="font-medium">{item.type}</span> | {item.exchange}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default UpcomingListings;
