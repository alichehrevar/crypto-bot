// This directive is required for components that use React Hooks
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { addToast } from "@heroui/react";

import { getData } from "@/actions/get";

// =====================================================================
// --- TYPE DEFINITIONS ---
// =====================================================================

// Represents a coin associated with an event
type EventCoin = {
    symbol: string;
    name: string;
};

// Represents a category for an event
type EventCategory = {
    id: number;
    name: string;
};

// Props for the InfoButton component
type InfoButtonProps = {
    title: string;
    content: string;
};

// The main event object structure from CoinMarketCal
// This replaces the old EconomicEvent type
type CoinMarketCalEvent = {
    // --- Core Identifiers ---
    id: number;          // Unique numeric ID for the event
    title: string;       // The event title (extracted from the 'en' property on the backend)

    // --- Relational Data ---
    coins: EventCoin[];      // Array of coins related to the event
    categories: EventCategory[]; // Array of categories for the event

    // --- Date & Time ---
    dateUtc: string;     // The main UTC timestamp added by the backend (ISO 8601 format)
    date_event: string;  // The original event date string from the API
    created_date: string;// When the event was added to the calendar
    displayed_date: string; // A user-friendly date string like "Q3 2025"

    // --- Additional Info & Links ---
    source: string;      // URL to the event source on CoinMarketCal
    proof: string;       // URL to the image proof for the event
    can_occur_before: boolean; // Flag indicating if the event can happen before the specified date

    // This property from the API has a non-standard name and must be quoted
    "-": string;
};

// The API response wrapper
type EconomicEventsApiResponse = {
    success: boolean;
    data: CoinMarketCalEvent[];
};

// Props for the CardHeader component
type CardHeaderProps = {
    title: string;
    infoTitle: string;
    infoContent: string;
    children?: React.ReactNode;
};

// Props for the EventTimeline component
type EventTimelineProps = {
    events: CoinMarketCalEvent[]; // Updated to use the imported EconomicEvent type
    setHighlightedEvent: React.Dispatch<React.SetStateAction<number | null>>;
};


// =====================================================================
// --- DATA FETCHER ---
// =====================================================================

const getEventsData = async (): Promise<EconomicEventsApiResponse> => {
    return await getData('/sentiment/events');
}

// =====================================================================
// --- REUSABLE & UTILITY COMPONENTS ---
// =====================================================================

const InfoButton: React.FC<InfoButtonProps> = ({ title, content }) => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const popupRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div ref={popupRef} className="relative flex items-center">
            <button
                className="flex items-center justify-center bg-transparent text-gray-500 border border-gray-500 rounded-full w-4 h-4 text-[10px] font-serif font-bold cursor-pointer transition-all duration-200 hover:border-white hover:text-white"
                onClick={() => setIsOpen(!isOpen)}
            >
                i
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 bg-black/50 backdrop-blur-md border border-white/10 rounded-lg p-4 w-72 z-50 shadow-2xl animate-fadeIn">
                    <h4 className="mt-0 mb-2 text-white font-semibold">{title}</h4>
                    <p className="mb-0 text-sm text-gray-300 leading-relaxed">{content}</p>
                </div>
            )}
        </div>
    );
};

const CardHeader: React.FC<CardHeaderProps> = ({ title, infoTitle, infoContent, children }) => (
    <div className="flex justify-between items-center max-md:flex-col max-md:items-start max-md:gap-4">
        <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <InfoButton content={infoContent} title={infoTitle} />
        </div>
        {children}
    </div>
);

const EventTimeline: React.FC<EventTimelineProps> = ({ events, setHighlightedEvent }) => {
    const now = new Date();

    if (events.length === 0) {
        return null;
    }

    const dates = events.map(e => new Date(e.dateUtc));
    const timelineStart = new Date(Math.min(...dates.map(d => d.getTime())));
    const timelineEnd = new Date(Math.max(...dates.map(d => d.getTime())));

    timelineStart.setDate(timelineStart.getDate() - 1);
    timelineEnd.setDate(timelineEnd.getDate() + 1);

    const totalDuration = timelineEnd.getTime() - timelineStart.getTime();

    const getPosition = (date: Date | string): number => {
        const eventDate = new Date(date);

        if (totalDuration === 0) return 50;
        const durationFromStart = eventDate.getTime() - timelineStart.getTime();

        return (durationFromStart / totalDuration) * 100;
    };

    // CHANGE: Simplified to take one UTC string argument
    const formatRelativeDate = (eventDateStr: string): string => {
        const eventDateTime = new Date(eventDateStr);
        const diffDays = Math.ceil((eventDateTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const time = eventDateTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();

        if (diffDays === 0) return `Today ${time}`;
        if (diffDays === 1) return `Tomorrow ${time}`;
        if (diffDays > 1 && diffDays < 7) {
            return `${eventDateTime.toLocaleDateString('en-US', { weekday: 'long' })} ${time}`;
        }

        return `${eventDateTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${time}`;
    };

    return (
        <div className="p-4 mt-12 mb-8">
            <div className="relative w-full h-0.5 bg-gray-700">
                <div className="absolute top-1/2 -translate-y-1/2" style={{ left: `${getPosition(now)}%` }}>
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 text-xs text-blue-500 whitespace-nowrap">Now</span>
                </div>
                {events.map((event) => {
                    // CHANGE: isPast is calculated here directly from dateUtc
                    const isPast = new Date(event.dateUtc) < now;

                    return (
                        <div
                            key={event.id}
                            className="group absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                            style={{ left: `${getPosition(event.dateUtc)}%` }}
                            onMouseEnter={() => setHighlightedEvent(event.id)} // CHANGE: Highlight by unique ID
                            onMouseLeave={() => setHighlightedEvent(null)}
                        >
                            <div className={`w-2.5 h-2.5 rounded-full cursor-pointer transition-colors duration-300 ${isPast ? 'bg-gray-500' : 'bg-green-500'}`} />
                            <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-800/70 backdrop-blur-sm border border-white/15 text-white p-2 rounded-md z-10 text-center w-max max-w-xs whitespace-normal leading-snug">
                                {/* CHANGE: Use event.title and display coin symbols */}
                                <span className="text-xs font-medium block">
                                    {event.coins.map(c => c.symbol).join(', ')}: {event.title}
                                </span>
                                <small className="text-[10px] opacity-80">{formatRelativeDate(event.dateUtc)}</small>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// =====================================================================
// --- MAIN EXPORT COMPONENT ---
// =====================================================================

const EventCalendar: React.FC = () => {
    // CHANGE: Use the new event type for state
    const [eventsData, setEventsData] = useState<CoinMarketCalEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    // CHANGE: Highlight by ID (number) for better accuracy
    const [highlightedEvent, setHighlightedEvent] = useState<number | null>(null);

    useEffect(() => {
        getEventsData()
            .then((response) => {
                if (response.success) {
                    setEventsData(response.data);
                } else {
                    addToast({ title: "Could not fetch events", color: 'warning' });
                }
            })
            .catch(() => {
                addToast({ title: 'Something went wrong!', description: 'Please try again later.', color: 'danger' });
            })
            .finally(() => setIsLoading(false));
    }, []);

    return (
        <div className="ua-card p-6 shadow-lg flex flex-col min-h-[400px]">
            <CardHeader
                infoContent="This calendar lists upcoming crypto-specific events that can act as market catalysts. Events like mainnet launches, token unlocks, and major announcements can influence market volatility."
                infoTitle="About the Event Calendar"
                title="Crypto Event Calendar"
            />
            {isLoading ? (
                <div className="flex-grow flex flex-col justify-center animate-pulse">
                    <div className="p-4 mt-12 mb-8"><div className="h-0.5 bg-gray-700 rounded-full" /></div>
                    <div className="space-y-4 mt-4">
                        <div className="h-4 bg-gray-700 rounded w-full" />
                        <div className="h-4 bg-gray-700 rounded w-5/6" />
                        <div className="h-4 bg-gray-700 rounded w-full" />
                    </div>
                </div>
            ) : (
                <>
                    <EventTimeline events={eventsData} setHighlightedEvent={setHighlightedEvent} />
                    <div className="w-full overflow-x-auto mt-4">
                        {eventsData.length > 0 ? (
                            <table className="w-full border-collapse text-sm">
                                <thead>
                                <tr className="border-b border-white/10">
                                    {/* CHANGE: Updated table headers */}
                                    <th className="text-left p-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Date</th>
                                    <th className="text-left p-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Time (Local)</th>
                                    <th className="text-left p-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Event</th>
                                    <th className="text-left p-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Category</th>
                                </tr>
                                </thead>
                                <tbody>
                                {eventsData.map((event) => {
                                    // CHANGE: All date/time logic is derived from dateUtc here
                                    const eventDate = new Date(event.dateUtc);
                                    const isPast = eventDate < new Date();

                                    // Format date to YYYY.MM.DD
                                    const formattedDate = eventDate.toLocaleDateString('sv-SE').replaceAll('-', '.');
                                    // Format time to user's local time
                                    const formattedTime = eventDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

                                    return (
                                        <tr
                                            key={event.id} // CHANGE: Use unique numeric id for the key
                                            className={`border-b border-white/10 last:border-b-0 transition-colors duration-300
                                                    ${event.id === highlightedEvent ? 'bg-white/10' : ''}
                                                    ${isPast ? 'text-gray-500' : 'text-gray-200'}
                                                `}
                                        >
                                            <td className="p-3 whitespace-nowrap">{formattedDate}</td>
                                            <td className="p-3 whitespace-nowrap">{formattedTime}</td>
                                            {/* CHANGE: Display richer event title */}
                                            <td className="p-3">
                                                <a className="hover:text-green-400 transition-colors" href={event.source} rel="noopener noreferrer" target="_blank">
                                                    <span className="font-bold">{event.coins.map(c => c.symbol).join(', ')}</span>: {event.title}
                                                </a>
                                            </td>
                                            {/* CHANGE: Display event categories */}
                                            <td className="p-3 whitespace-nowrap">{event.categories.map(c => c.name).join(', ')}</td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        ) : (
                            <div className="flex justify-center items-center h-48">
                                <p className="text-gray-400">No upcoming events found.</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default EventCalendar;
