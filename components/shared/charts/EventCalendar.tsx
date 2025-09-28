// This directive is required for components that use React Hooks
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { addToast } from "@heroui/react";

import { getData } from "@/actions/get";
import { EconomicEvent, EconomicEventsApiResponse, EventImpact } from "@/types/market/EconomicEvent";

// =====================================================================
// --- TYPE DEFINITIONS ---
// =====================================================================

// Props for the InfoButton component
type InfoButtonProps = {
    title: string;
    content: string;
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
    events: EconomicEvent[]; // Updated to use the imported EconomicEvent type
    setHighlightedEvent: React.Dispatch<React.SetStateAction<string | null>>;
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
    // Using current date for "Now" marker
    const now = new Date();

    // Return null if there are no events to prevent errors
    if (events.length === 0) {
        return null;
    }

    const dates = events.map(e => new Date(e.date));
    const timelineStart = new Date(Math.min(...dates.map(d => d.getTime())));
    const timelineEnd = new Date(Math.max(...dates.map(d => d.getTime())));

    // Add padding to the timeline
    timelineStart.setDate(timelineStart.getDate() - 1);
    timelineEnd.setDate(timelineEnd.getDate() + 1);

    const totalDuration = timelineEnd.getTime() - timelineStart.getTime();

    const getPosition = (date: Date | string): number => {
        const eventDate = new Date(date);

        if (totalDuration === 0) return 50;
        const durationFromStart = eventDate.getTime() - timelineStart.getTime();

        return (durationFromStart / totalDuration) * 100;
    };

    // This function can be expanded to handle more date formats
    const parseTime = (timeStr: string): string => {
        // Example: "12:00 AM UTC" -> "00:00"
        if (timeStr.includes("AM") || timeStr.includes("PM")) {
            const [time, period] = timeStr.split(' ');
            let [hours, minutes] = time.split(':').map(Number);

            if (period.toUpperCase() === 'PM' && hours !== 12) hours += 12;
            if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;

            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        }

        return "00:00"; // Default fallback
    }

    const formatRelativeDate = (eventDateStr: string, eventTimeStr: string): string => {
        const eventDateTime = new Date(`${eventDateStr}T${parseTime(eventTimeStr)}:00Z`);
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
                {events.map((event) => (
                    <div
                        key={event._id}
                        className="group absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${getPosition(event.date)}%` }}
                        onMouseEnter={() => setHighlightedEvent(event.date)}
                        onMouseLeave={() => setHighlightedEvent(null)}
                    >
                        <div className={`w-2.5 h-2.5 rounded-full cursor-pointer transition-colors duration-300 ${event.isPast ? 'bg-gray-500' : 'bg-blue-500'}`} />
                        <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-800/70 backdrop-blur-sm border border-white/15 text-white p-2 rounded-md z-10 text-center w-max max-w-xs whitespace-normal leading-snug">
                            <span className="text-xs font-medium block">{event.event}</span>
                            <small className="text-[10px] opacity-80">{formatRelativeDate(event.date, event.time)}</small>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// =====================================================================
// --- MAIN EXPORT COMPONENT ---
// =====================================================================

const EventCalendar: React.FC = () => {
    const [eventsData, setEventsData] = useState<EconomicEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [highlightedEvent, setHighlightedEvent] = useState<string | null>(null);

    useEffect(() => {
        getEventsData()
            .then((response) => { // Type is inferred from the function's return type
                if (response.success) {
                    setEventsData(response.data);
                } else {
                    addToast({
                        title: "Could not fetch events",
                        color: 'warning'
                    });
                }
            })
            .catch(() => {
                addToast({
                    title: 'Something went wrong!',
                    description: 'Please try again later.',
                    color: 'danger'
                });
            })
            .finally(() => setIsLoading(false));
    }, []);

    const getImpactClass = (impact: EventImpact): string => { // Using imported EventImpact type
        switch (impact) {
            case 'High': return 'text-red-500 font-bold';
            case 'Medium': return 'text-orange-400 font-bold';
            case 'Low': return 'text-green-500 font-bold';
            default: return 'text-gray-400';
        }
    };

    return (
        <div className="bg-dark-gray rounded-lg p-6 shadow-lg flex flex-col min-h-[400px]">
            <CardHeader
                infoContent="This calendar lists upcoming economic data releases and crypto-specific events that can act as major market catalysts. High-impact events like CPI data or FOMC meetings often cause significant volatility, and trading bots can be programmed to react to these specific events."
                infoTitle="About the Event Calendar"
                title="Economic Catalysts & Event Calendar"
            />
            {isLoading ? (
                // --- Loading Skeleton ---
                <div className="flex-grow flex flex-col justify-center animate-pulse">
                    <div className="p-4 mt-12 mb-8">
                        <div className="h-0.5 bg-gray-700 rounded-full" />
                    </div>
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
                                    <th className="text-left p-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Date</th>
                                    <th className="text-left p-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Time</th>
                                    <th className="text-left p-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Event</th>
                                    <th className="text-left p-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Impact</th>
                                    <th className="text-left p-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Forecast</th>
                                    <th className="text-left p-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Actual</th>
                                </tr>
                                </thead>
                                <tbody>
                                {eventsData.map((event) => (
                                    <tr
                                        key={event._id} // Use unique _id for the key
                                        className={`border-b border-white/10 last:border-b-0 transition-colors duration-300
                                            ${event.date === highlightedEvent ? 'bg-white/10' : ''}
                                            ${event.isPast ? 'text-gray-500' : 'text-gray-200'}
                                        `}
                                    >
                                        <td className="p-3 whitespace-nowrap">{event.date.replaceAll('-', '.')}</td>
                                        <td className="p-3">{event.time.replace(' UTC', '')}</td>
                                        <td className="p-3">{event.event}</td>
                                        <td className={`p-3 ${getImpactClass(event.impact)}`}>{event.impact}</td>
                                        <td className="p-3">{event.forecast}</td>
                                        <td className="p-3">{event.actual}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        ) : (
                            // --- Empty State ---
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
