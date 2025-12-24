"use client";

import React, { useState, useEffect, useRef } from 'react';
import { addToast } from "@heroui/react";

import { getData } from "@/actions/get";
import { ApiResponse, CryptoEvent } from "@/types/UpcomingListing";
import LoadingWithSpinner from "@/components/loading/LoadingWithSpinner";

// =====================================================================
// --- REUSABLE & UTILITY COMPONENTS ---
// =====================================================================

const glossary: Record<string, string> = {
    'ROI': 'Return on investment measures the profitability of an investment as a percentage of the original cost.',
};

const GlossaryTerm = ({ term }: { term: string }) => (
    <span className="group relative cursor-default border-b border-dashed border-blue-500">
        {term}
        <span className="invisible absolute bottom-full left-1/2 mb-2 w-56 -translate-x-1/2 rounded-md border border-white/10 bg-zinc-900/70 p-2.5 text-xs font-normal text-white opacity-0 backdrop-blur-md transition-opacity group-hover:visible group-hover:opacity-100 z-50">
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
            <button
                aria-label="More info"
                className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border border-gray-500 font-serif text-[10px] font-bold italic text-gray-500 transition-colors hover:border-white hover:text-white"
                onClick={() => setIsOpen(!isOpen)}
            >
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
    const [upcomingListingsData, setUpcomingListingsData] = useState<CryptoEvent[]>([]);
    const [recentListingData, setRecentListingData] = useState<CryptoEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    async function fetchListings() {
        return await getData('/listings');
    }

    useEffect(() => {
        fetchListings()
            .then((response: ApiResponse) => {
                if (response.success) {
                    setUpcomingListingsData(response.data.upcoming);
                    setRecentListingData(response.data.recent);
                } else {
                    addToast({
                        title: response.message,
                        color: "warning"
                    });
                }
            })
            .catch((error) => {
                addToast({
                    title: error.message || "Failed to fetch listings",
                    color: "danger"
                });
            })
            .finally(() => setIsLoading(false));
    }, []);

    // Helper to safely format currency
    const formatPrice = (price: number) => {
        if (!price || price === 0) return <span className="text-gray-500 italic">TBD</span>;

        // Show more decimals for small values, fewer for large
        return price < 1
            ? `$${price.toFixed(6)}`
            : `$${price.toFixed(2)}`;
    };

    return (
        <main>
            <div className="grid grid-cols-1 gap-2 xl:grid-cols-[1fr_2fr]">

                {/* --- LEFT CARD: Upcoming Listings --- */}
                <div className="flex h-full flex-col ua-card py-6 px-4 shadow-2xl">
                    <CardHeader
                        infoContent="This timeline tracks high-anticipation events like Token Generation Events (TGEs), exchange listings, and airdrop claims."
                        title="Upcoming Listings"
                    />
                    <div className="mt-6 max-h-[400px] px-2 overflow-y-auto h-full custom-scrollbar">
                        {isLoading ? (
                            <LoadingWithSpinner />
                        ) : (
                            <>
                                {upcomingListingsData.map((item, index) => {
                                    const coinName = item.coins && item.coins.length > 0 ? item.coins[0].name : "Unknown Token";
                                    const coinSymbol = item.coins && item.coins.length > 0 ? item.coins[0].symbol : "";

                                    return (
                                        <div key={item._id || index} className="relative border-l-2 border-white/20 pb-6 pl-8 last:border-0 last:pb-0">
                                            <span className="absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-[#1a1a1a] bg-blue-500" />

                                            {/* Date */}
                                            <div className="mb-1 text-xs font-mono text-blue-400 uppercase tracking-wide">
                                                {item.displayed_date}
                                            </div>

                                            {/* Coin Name */}
                                            <div className="text-base font-bold text-white">
                                                {coinName} <span className="text-xs font-normal text-gray-500">{coinSymbol}</span>
                                            </div>

                                            {/* Event Title with Source Link */}
                                            <div className="text-sm text-gray-300 mt-1">
                                                {item.source ? (
                                                    <a
                                                        className="hover:text-blue-400 hover:underline transition-colors"
                                                        href={item.source}
                                                        rel="noopener noreferrer"
                                                        target="_blank"
                                                    >
                                                        {item.title} ↗
                                                    </a>
                                                ) : (
                                                    <span>{item.title}</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        )}
                        {!isLoading && upcomingListingsData.length === 0 && (
                            <div className="flex h-32 items-center justify-center text-sm text-gray-500 italic">
                                No upcoming listings found.
                            </div>
                        )}
                    </div>
                </div>

                {/* --- RIGHT CARD: Launch Performance Tracker --- */}
                <div className="flex h-full flex-col ua-card p-6 shadow-2xl">
                    <CardHeader
                        infoContent="This table tracks the performance of recently launched tokens. 'Velocity' indicates price momentum since listing."
                        title="Launch Performance Tracker"
                    />
                    <div className="overflow-x-auto h-[400px] mt-4 custom-scrollbar">
                        <table className="w-full min-w-[600px] border-collapse text-sm">
                            <thead className="sticky top-0 bg-[#1a1a1a] z-10">
                            <tr className="border-b border-white/10">
                                <th className="p-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Asset</th>
                                <th className="p-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                                <th className="p-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Launch Price</th>
                                <th className="p-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Current Price</th>
                                <th className="p-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider"><GlossaryTerm term="ROI" /></th>
                                <th className="p-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Velocity</th>
                            </tr>
                            </thead>
                            <tbody>
                            {isLoading ? (
                                <tr>
                                    <td className="h-32" colSpan={6}>
                                        <LoadingWithSpinner />
                                    </td>
                                </tr>
                            ) : (
                                <>
                                    {recentListingData.map((item, index) => {
                                        const coin = item.coins && item.coins.length > 0 ? item.coins[0] : null;
                                        const hasPriceData = item.launchPrice > 0 && item.currentPrice > 0;

                                        // Safe ROI Calculation
                                        let roi = 0;

                                        if (hasPriceData) {
                                            roi = ((item.currentPrice - item.launchPrice) / item.launchPrice) * 100;
                                        }

                                        // Velocity Styling
                                        let velocityColor = 'text-gray-400';

                                        if (item.velocity?.includes('High ↑')) velocityColor = 'text-green-400 font-bold';
                                        if (item.velocity?.includes('High ↓')) velocityColor = 'text-red-400 font-bold';
                                        if (item.velocity === 'Medium') velocityColor = 'text-yellow-400';

                                        return (
                                            <tr key={item._id || index} className="group border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                                {/* Asset Column */}
                                                <td className="p-3 font-medium text-white">
                                                    <div className="flex flex-col">
                                                        <span>{coin ? coin.name : 'Unknown'}</span>
                                                        <span className="text-xs text-gray-500">{coin ? coin.symbol : ''}</span>
                                                    </div>
                                                </td>

                                                {/* Date Column */}
                                                <td className="p-3 text-gray-400 whitespace-nowrap">
                                                    {item.displayed_date}
                                                </td>

                                                {/* Launch Price */}
                                                <td className="p-3 text-right text-gray-300 font-mono">
                                                    {formatPrice(item.launchPrice)}
                                                </td>

                                                {/* Current Price */}
                                                <td className="p-3 text-right text-gray-300 font-mono">
                                                    {formatPrice(item.currentPrice)}
                                                </td>

                                                {/* ROI */}
                                                <td className={`p-3 text-right font-mono font-semibold ${
                                                    !hasPriceData ? 'text-gray-500' :
                                                        roi > 0 ? 'text-green-500' :
                                                            roi < 0 ? 'text-red-500' : 'text-gray-300'
                                                }`}>
                                                    {hasPriceData ? `${roi > 0 ? '+' : ''}${roi.toFixed(2)}%` : '-'}
                                                </td>

                                                {/* Velocity */}
                                                <td className={`p-3 text-center text-xs ${velocityColor}`}>
                                                    {item.velocity || 'N/A'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </>
                            )}
                            {!isLoading && recentListingData.length === 0 && (
                                <tr>
                                    <td className="p-3 text-center text-sm text-gray-500 h-32 italic" colSpan={6}>
                                        No recent launch data available.
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </main>
    );
}
