"use client";

import React, {useState, useEffect, useRef} from 'react';
import {addToast} from "@heroui/react";

import {getData} from "@/actions/get";
import {ApiResponse, CryptoEvent} from "@/types/UpcomingListing";
import LoadingWithSpinner from "@/components/loading/LoadingWithSpinner";


// =====================================================================
// --- REUSABLE & UTILITY COMPONENTS (Keep them as they are) ---
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
    // ... (This component remains unchanged)
    <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
            <h3 className="m-0 text-lg font-semibold text-white">{title}</h3>
            {infoContent && <InfoButton content={infoContent} />}
        </div>
    </div>
);


// =====================================================================
// --- MAIN PAGE COMPONENT (Updated) ---
// =====================================================================

export default function NewListingsPage() {
    const [upcomingListingsData, setUpcomingListingsData] = useState<CryptoEvent[]>([]);
    const [recentListingData, setRecentListingData] = useState<CryptoEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    async function fetchListings () {
        return await getData('/listings')
    }

    useEffect(() => {
        fetchListings()
            .then((response: ApiResponse) => {
                if (response.success) {
                    setUpcomingListingsData(response.data.upcoming)
                    setRecentListingData(response.data.recent)
                } else {
                    addToast({
                        title: response.message,
                        color: "warning"
                    })
                }
            })
            .catch((error) => {
                addToast({
                    title: error.message,
                    color: "danger"
                })
            })
            .finally(() => setIsLoading(false))
    }, []);

    return (
        <main>
            <div className="grid grid-cols-1 gap-2 xl:grid-cols-[1fr_2fr]">

                {/* Card for Upcoming Listings */}
                <div className="flex h-full flex-col ua-card py-6 px-4 shadow-2xl">
                    <CardHeader
                        infoContent="This timeline tracks high-anticipation events like Token Generation Events (TGEs), exchange listings, and airdrop claims. These are often volatile periods that present unique trading opportunities."
                        title="Upcoming Listings"
                    />
                    <div className="mt-6 max-h-[300px] px-2 overflow-y-auto h-full no-scrollbar">
                        {isLoading
                            ? <LoadingWithSpinner />
                            : <>
                                {upcomingListingsData.map((item, index) => (
                                    <div key={index} className="relative border-l-2 border-white/20 pb-2 pl-8 last:mb-0 mb-8">
                                        <span className="absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-[#1a1a1a] bg-blue-500" />
                                        <div className="mb-1 text-sm text-gray-400">{item.displayed_date} {new Date(item.date_event).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        <div className="text-base font-semibold">{item.coins[0].name}</div>
                                        <div className="text-sm text-gray-300">
                                            <strong>{item.title}</strong>
                                        </div>
                                    </div>
                                ))}
                            </>
                        }
                        {!isLoading && upcomingListingsData.length === 0 && (
                            <div className="text-center text-sm text-gray-400">
                                No upcoming listings.
                            </div>
                        )}
                    </div>
                </div>

                {/* Card for Recent Launch Performance */}
                <div className="flex h-full flex-col ua-card p-6 shadow-2xl">
                    <CardHeader
                        infoContent="This table tracks the performance of recently launched tokens since their debut. 'Velocity' is a qualitative measure of post-launch momentum and market appetite."
                        title="Launch Performance Tracker"
                    />
                    <div className="overflow-x-auto  h-[300px]">
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
                                {isLoading
                                    ? <tr>
                                        <td colSpan={6}>
                                            <LoadingWithSpinner />
                                        </td>
                                    </tr>
                                    : <>
                                        {recentListingData.map((item, index) => {
                                            const roi = ((item.currentPrice - item.launchPrice) / item.launchPrice) * 100;

                                            return (
                                                <tr key={index} className="border-b border-white/10 last:border-b-0">
                                                    <td className="p-3 font-medium">{item.launchPrice}</td>
                                                    <td className="p-3 text-gray-300">{new Date(item.displayed_date).toLocaleDateString()}</td>
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
                                    </>
                                }
                                {!isLoading && recentListingData.length === 0 && (
                                    <tr>
                                        <td className="p-3 text-center text-sm text-gray-400 h-32" colSpan={6}>
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
