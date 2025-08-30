// src/app/page.tsx

"use client"; // Required because the InfoButton uses client-side hooks (useState, useEffect)

import React, { useState, useMemo, useEffect, useRef } from 'react';

// =====================================================================
// --- MOCK DATA ---
// =====================================================================
const generateNewListingsData = () => ({
    upcoming: [
        { date: '2025-08-15 12:00 UTC', asset: 'ZKSync (ZK)', type: 'Token Generation Event (TGE)', exchange: 'Multiple' },
        { date: '2025-08-22 14:00 UTC', asset: 'LayerZero (ZRO)', type: 'Listing', exchange: 'Binance, Coinbase' },
        { date: '2025-09-01 10:00 UTC', asset: 'Blast L2 (BLAST)', type: 'Airdrop Claim Opens', exchange: 'N/A' },
    ],
    recent: [
        { asset: 'Wormhole (W)', launchDate: '2025-07-10', launchPrice: 1.25, currentPrice: 0.95, velocity: 'Medium' as const },
        { asset: 'Ethena (ENA)', launchDate: '2025-07-15', launchPrice: 0.60, currentPrice: 1.80, velocity: 'Very High' as const },
        { asset: 'Tensor (TNSR)', launchDate: '2025-08-01', launchPrice: 1.50, currentPrice: 1.65, velocity: 'High' as const },
    ]
});

// =====================================================================
// --- REUSABLE & UTILITY COMPONENTS ---
// =====================================================================

const glossary: Record<string, string> = {
    'ROI': 'Return on investment measures the profitability of an investment as a percentage of the original cost.',
};

const GlossaryTerm = ({ term }: { term: string }) => (
    <span className="group relative cursor-default border-b border-dashed border-blue-500">
    {term}
        <span className="invisible absolute bottom-full left-1/2 mb-2 w-56 -translate-x-1/2 rounded-md border border-white/10 bg-zinc-900/70 p-2.5 text-xs font-normal text-white opacity-0 backdrop-blur-md transition-opacity group-hover:visible group-hover:opacity-100">
      {glossary[term]}
    </span>
  </span>
);

const InfoButton = ({ content }: { content: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    const popupRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    return (
        <div ref={popupRef} className="relative flex items-center">
            <button aria-label="More info" className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border border-gray-500 font-serif text-[10px] font-bold italic text-gray-500 transition-colors hover:border-white hover:text-white" onClick={() => setIsOpen(!isOpen)}>
                i
            </button>
            {isOpen && (
                <div className="animate-fadeIn absolute left-0 top-full z-50 mt-2 w-72 rounded-lg border border-white/10 bg-zinc-900/70 p-4 shadow-2xl backdrop-blur-md">
                    <p className="m-0 text-sm leading-relaxed text-gray-300">{content}</p>
                </div>
            )}
        </div>
    );
};

const CardHeader = ({ title, infoContent }: { title: string; infoContent?: string; }) => (
    <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
            <h3 className="m-0 text-lg font-semibold text-white">{title}</h3>
            {infoContent && <InfoButton content={infoContent} />}
        </div>
    </div>
);


// =====================================================================
// --- MAIN PAGE COMPONENT ---
// =====================================================================

export default function NewListingsPage() {
    const listingsData = useMemo(() => generateNewListingsData(), []);

    return (
        <main className="min-h-screen p-4 md:p-8">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_2fr]">

                {/* Card for Upcoming Listings */}
                <div className="flex h-full flex-col rounded-xl border border-white/5 bg-[#1a1a1a] p-6 shadow-2xl">
                    <CardHeader
                        infoContent="This timeline tracks high-anticipation events like Token Generation Events (TGEs), exchange listings, and airdrop claims. These are often volatile periods that present unique trading opportunities."
                        title="Upcoming Listings"
                    />
                    <div className="mt-6">
                        {listingsData.upcoming.map((item, index) => (
                            <div key={index} className="relative border-l-2 border-white/20 pb-2 pl-8 last:mb-0 last:border-transparent mb-8">
                                <span className="absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-[#1a1a1a] bg-blue-500" />
                                <div className="mb-1 text-sm text-gray-400">{item.date}</div>
                                <div className="text-base font-semibold">{item.asset}</div>
                                <div className="text-sm text-gray-300">
                                    <strong>{item.type}</strong> | {item.exchange}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Card for Recent Launch Performance */}
                <div className="flex h-full flex-col rounded-xl border border-white/5 bg-[#1a1a1a] p-6 shadow-2xl">
                    <CardHeader
                        infoContent="This table tracks the performance of recently launched tokens since their debut. 'Velocity' is a qualitative measure of post-launch momentum and market appetite."
                        title="Launch Performance Tracker"
                    />
                    <div className="overflow-x-auto">
                        <table className="mt-6 w-full min-w-[600px] border-collapse text-sm">
                            <thead>
                            <tr className="border-b border-white/10">
                                <th className="p-3 text-left text-xs font-medium text-gray-400">Asset</th>
                                <th className="p-3 text-left text-xs font-medium text-gray-400">Launch Date</th>
                                <th className="p-3 text-left text-xs font-medium text-gray-400">Launch Price</th>
                                <th className="p-3 text-left text-xs font-medium text-gray-400">Current Price</th>
                                <th className="p-3 text-left text-xs font-medium text-gray-400"><GlossaryTerm term="ROI" /> (%)</th>
                                <th className="p-3 text-left text-xs font-medium text-gray-400">Velocity</th>
                            </tr>
                            </thead>
                            <tbody>
                            {listingsData.recent.map(item => {
                                const roi = ((item.currentPrice - item.launchPrice) / item.launchPrice) * 100;

                                return (
                                    <tr key={item.asset} className="border-b border-white/10 last:border-b-0">
                                        <td className="p-3 font-medium">{item.asset}</td>
                                        <td className="p-3 text-gray-300">{item.launchDate.replace(/-/g, '.')}</td>
                                        <td className="p-3 text-gray-300">${item.launchPrice.toFixed(2)}</td>
                                        <td className="p-3 text-gray-300">${item.currentPrice.toFixed(2)}</td>
                                        <td className={`p-3 font-semibold ${roi >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                            {roi.toFixed(2)}%
                                        </td>
                                        <td className={`p-3 text-gray-300 ${item.velocity.includes('High') ? 'font-semibold' : 'font-normal'}`}>
                                            {item.velocity}
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </main>
    );
}
