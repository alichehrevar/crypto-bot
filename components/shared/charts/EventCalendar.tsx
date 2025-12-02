'use client';

import React, { useState, useEffect, useRef, FC, ReactNode } from 'react';

// =====================================================================
// --- TYPE DEFINITIONS ---
// =====================================================================

interface Event {
    date: string;
    time: string;
    event: string;
    impact: 'High' | 'Medium' | 'Low';
    forecast: string;
    actual: string;
    isPast?: boolean;
}

// =====================================================================
// --- MOCK DATA (FOR DEMONSTRATION) ---
// =====================================================================

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

interface InfoButtonProps {
    title: string;
    content: string;
}

const InfoButton: FC<InfoButtonProps> = ({ title, content }) => {
    const [isOpen, setIsOpen] = useState(false);
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
                className="flex items-center justify-center bg-transparent text-gray-500 border border-gray-500 rounded-full w-4 h-4 text-[10px] italic font-serif font-bold cursor-pointer transition-all hover:border-white hover:text-white"
                onClick={() => setIsOpen(!isOpen)}
            >
                i
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 bg-gray-900/70 backdrop-blur-md border border-white/10 rounded-lg p-4 w-72 z-20 shadow-2xl animate-fade-in">
                    <h4 className="mt-0 mb-2 text-white font-semibold">{title}</h4>
                    <p className="mb-0 text-sm text-gray-300 leading-relaxed">{content}</p>
                </div>
            )}
        </div>
    );
};

interface CardHeaderProps {
    title: string;
    infoTitle: string;
    infoContent: string;
    children?: ReactNode;
}

const CardHeader: FC<CardHeaderProps> = ({ title, infoTitle, infoContent, children }) => (
    <div className="flex justify-between items-center md:flex-row flex-col items-start gap-4">
        <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-white m-0">{title}</h3>
            <InfoButton content={infoContent} title={infoTitle} />
        </div>
        {children}
    </div>
);


interface EventTimelineProps {
    events: Event[];
    setHighlightedEvent: (date: string | null) => void;
}

const EventTimeline: FC<EventTimelineProps> = ({ events, setHighlightedEvent }) => {
    // NOTE: 'now' is hardcoded for consistent demonstration.
    const now = new Date('2025-08-13');

    const dates = events.map(e => new Date(e.date));
    const timelineStart = new Date(Math.min(...dates.map(d => d.getTime())));
    const timelineEnd = new Date(Math.max(...dates.map(d => d.getTime())));

    timelineStart.setDate(timelineStart.getDate() - 1);
    timelineEnd.setDate(timelineEnd.getDate() + 1);

    const totalDuration = timelineEnd.getTime() - timelineStart.getTime();

    const getPosition = (date: string | Date): number => {
        const eventDate = new Date(date);

        if (totalDuration === 0) return 50;
        const durationFromStart = eventDate.getTime() - timelineStart.getTime();

        return (durationFromStart / totalDuration) * 100;
    };

    const formatRelativeDate = (eventDateStr: string, eventTimeStr: string): string => {
        const eventDateTime = new Date(`${eventDateStr}T${eventTimeStr.split(' ')[0]}:00Z`);
        const diffTime = eventDateTime.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-blue-500">Now</span>
                </div>
                {events.map((event, index) => (
                    <div
                        key={index}
                        className="group absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${getPosition(event.date)}%` }}
                        onMouseEnter={() => setHighlightedEvent(event.date)}
                        onMouseLeave={() => setHighlightedEvent(null)}
                    >
                        <div className={`w-2.5 h-2.5 rounded-full cursor-pointer transition-colors ${event.isPast ? 'bg-gray-500' : 'bg-blue-500'}`} />
                        <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-800/80 backdrop-blur border border-white/15 text-white p-2 rounded-md z-10 text-center w-max max-w-[200px] whitespace-normal leading-snug">
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
// --- MAIN COMPONENT ---
// =====================================================================

interface EconomicCatalystsAndEventCalendarProps {
    data: {
        events: Event[];
    };
}

const EconomicCatalystsAndEventCalendar: FC<EconomicCatalystsAndEventCalendarProps> = ({ data }) => {
    const [highlightedEvent, setHighlightedEvent] = useState<string | null>(null);

    const getImpactClass = (impact: 'High' | 'Medium' | 'Low'): string => {
        switch (impact) {
            case 'High': return 'text-red-500 font-bold';
            case 'Medium': return 'text-orange-400 font-bold';
            case 'Low': return 'text-green-500 font-bold';
            default: return 'text-gray-400';
        }
    };

    const formatValue = (value: string): string => {
        if (typeof value !== 'string') return value;

        return value.replace(' tokens', '');
    };

    return (
        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-white/5 shadow-lg h-full flex flex-col">
            <CardHeader
                infoContent="This calendar lists upcoming economic data releases and crypto-specific events that can act as major market catalysts. High-impact events like CPI data or FOMC meetings often cause significant volatility."
                infoTitle="About the Event Calendar"
                title="Economic Catalysts & Event Calendar"
            />
            <EventTimeline events={data.events} setHighlightedEvent={setHighlightedEvent} />
            <div className="w-full overflow-x-auto mt-4">
                <table className="w-full border-collapse text-sm">
                    <thead>
                    <tr className="border-b border-white/10">
                        <th className="text-left p-3 font-medium text-gray-400">Date</th>
                        <th className="text-left p-3 font-medium text-gray-400">Time (UTC)</th>
                        <th className="text-left p-3 font-medium text-gray-400">Event</th>
                        <th className="text-left p-3 font-medium text-gray-400">Impact</th>
                        <th className="text-left p-3 font-medium text-gray-400">Forecast</th>
                        <th className="text-left p-3 font-medium text-gray-400">Actual</th>
                    </tr>
                    </thead>
                    <tbody>
                    {data.events.map((event, index) => (
                        <tr
                            key={index}
                            className={`border-b border-white/10 last:border-b-0 transition-colors ${event.date === highlightedEvent ? 'bg-white/10' : ''} ${event.isPast ? 'text-gray-500' : 'text-gray-200'}`}
                        >
                            <td className="p-3 whitespace-nowrap">{event.date.replaceAll('-', '.')}</td>
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

// =====================================================================
// --- DEMONSTRATION WRAPPER ---
// =====================================================================

const MarketEventCalendar: FC = () => {
    const sentimentData = generateSentimentData();

    return (
        <main className="ua-card">
            <div className="w-full">
                <EconomicCatalystsAndEventCalendar data={sentimentData} />
            </div>
        </main>
    )
}


export default MarketEventCalendar;
