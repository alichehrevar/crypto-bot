// This directive is required for components that use React Hooks
"use client";

import React, { useState, useEffect, useRef } from 'react';

// =====================================================================
// --- TYPE DEFINITIONS ---
// =====================================================================

// Defines the structure for a single calendar event
type Event = {
    date: string;
    time: string;
    event: string;
    impact: 'High' | 'Medium' | 'Low'; // Use a union type for specific values
    forecast: string;
    actual: string;
    isPast?: boolean; // Optional property
};

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
    children?: React.ReactNode; // Type for optional children
};

// Props for the EventTimeline component
type EventTimelineProps = {
    events: Event[];
    setHighlightedEvent: React.Dispatch<React.SetStateAction<string | null>>;
};


// =====================================================================
// --- MOCK DATA ---
// =====================================================================

// The function now returns a typed object
const generateSentimentData = (): { events: Event[] } => {
    return {
        events: [
            { date: '2025-08-08', time: '14:00 UTC', event: 'US Non-Farm Payrolls (July)', impact: 'High', forecast: '180k', actual: '205k', isPast: true },
            { date: '2025-08-12', time: '12:30 UTC', event: 'US CPI Data Release (July)', impact: 'High', forecast: '3.1%', actual: '3.2%', isPast: true },
            { date: '2025-08-15', time: '16:00 UTC', event: 'Ethereum "Pectra" Upgrade Spec', impact: 'Medium', forecast: 'N/A', actual: 'TBD' },
            { date: '2025-08-18', time: '10:00 UTC', event: 'Token Unlocks (APT)', impact: 'Low', forecast: '11.3M', actual: 'TBD' },
            { date: '2025-08-20', time: '18:00 UTC', event: 'FOMC Meeting Minutes', impact: 'High', forecast: 'N/A', actual: 'TBD' },
            { date: '2025-08-28', time: '18:30 UTC', event: 'US GDP Growth Rate (Q2 Final)', impact: 'Medium', forecast: '2.5%', actual: 'TBD' },
        ],
    };
};


// =====================================================================
// --- REUSABLE & UTILITY COMPONENTS ---
// =====================================================================

const InfoButton: React.FC<InfoButtonProps> = ({ title, content }) => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const popupRef = useRef<HTMLDivElement>(null); // Type the ref

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { // Type the event
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
    const now = new Date('2025-08-13'); // Hardcoded for consistent demo

    const dates = events.map(e => new Date(e.date));
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

    const formatRelativeDate = (eventDateStr: string, eventTimeStr: string): string => {
        const eventDateTime = new Date(`${eventDateStr}T${eventTimeStr.split(' ')[0]}:00Z`);
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
                        key={event.event + event.date}
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
    const data = generateSentimentData();
    const [highlightedEvent, setHighlightedEvent] = useState<string | null>(null);

    const getImpactClass = (impact: Event['impact']): string => {
        switch (impact) {
            case 'High': return 'text-red-500 font-bold';
            case 'Medium': return 'text-orange-400 font-bold';
            case 'Low': return 'text-green-500 font-bold';
        }
    };

    const formatValue = (value: string): string => value.replace(' tokens', '');

    return (
        <div className="bg-dark-gray rounded-lg p-6 shadow-lg flex flex-col">
            <CardHeader
                infoContent="This calendar lists upcoming economic data releases and crypto-specific events that can act as major market catalysts. High-impact events like CPI data or FOMC meetings often cause significant volatility, and trading bots can be programmed to react to these specific events."
                infoTitle="About the Event Calendar"
                title="Economic Catalysts & Event Calendar"
            />
            <EventTimeline events={data.events} setHighlightedEvent={setHighlightedEvent} />
            <div className="w-full overflow-x-auto mt-4">
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
                    {data.events.map((event) => (
                        <tr
                            key={event.event + event.date}
                            className={`border-b border-white/10 last:border-b-0 transition-colors duration-300
                                    ${event.date === highlightedEvent ? 'bg-white/10' : ''}
                                    ${event.isPast ? 'text-gray-500' : 'text-gray-200'}
                                `}
                        >
                            <td className="p-3">{event.date.replaceAll('-', '.')}</td>
                            <td className="p-3">{event.time.replace(' UTC', '')}</td>
                            <td className="p-3">{event.event}</td>
                            <td className={`p-3 ${getImpactClass(event.impact)}`}>{event.impact}</td>
                            <td className="p-3">{formatValue(event.forecast)}</td>
                            <td className="p-3">{formatValue(event.actual)}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default EventCalendar;
