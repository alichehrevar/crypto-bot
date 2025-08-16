'use client';

import React, { useState, useMemo } from 'react';

// =====================================================================
// --- TYPE DEFINITIONS ---
// =====================================================================

interface CalendarEvent {
    date: string;
    time: string;
    event: string;
    impact: 'High' | 'Medium' | 'Low';
    forecast: string;
    actual: string;
    isPast?: boolean;
}

export interface CalendarData {
    events: CalendarEvent[];
}

// =====================================================================
// --- REUSABLE SUB-COMPONENTS ---
// =====================================================================

const EventTimeline: React.FC<{ events: CalendarEvent[]; setHighlightedEvent: (date: string | null) => void }> = ({ events, setHighlightedEvent }) => {
    // Hardcoded for consistent demonstration. In a real app, this would be new Date().
    const now = new Date('2025-08-16');

    const { timelineStart, totalDuration } = useMemo(() => {
        // [FIX] Convert each date to a numerical timestamp for comparison
        const timestamps = events.map(e => new Date(e.date).getTime());

        // Now Math.min and Math.max work correctly with the numbers
        const start = new Date(Math.min(...timestamps));
        const end = new Date(Math.max(...timestamps));

        start.setDate(start.getDate() - 1); // Add padding
        end.setDate(end.getDate() + 1);     // Add padding

        return {
            timelineStart: start,
            totalDuration: end.getTime() - start.getTime(),
        };
    }, [events]);

    const getPosition = (date: Date) => {
        if (totalDuration === 0) return 50;
        const durationFromStart = date.getTime() - timelineStart.getTime();

        return (durationFromStart / totalDuration) * 100;
    };

    const formatRelativeDate = (eventDateStr: string, eventTimeStr: string) => {
        const eventDateTime = new Date(`${eventDateStr}T${eventTimeStr.split(' ')[0]}:00Z`);
        const diffDays = Math.ceil((eventDateTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const time = eventDateTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();

        if (diffDays === 0) return `Today ${time}`;
        if (diffDays === 1) return `Tomorrow ${time}`;
        if (diffDays > 1 && diffDays < 7) return `${eventDateTime.toLocaleDateString('en-US', { weekday: 'long' })} ${time}`;

        return `${eventDateTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${time}`;
    };

    return (
        <div className="my-12 mx-4">
            <div className="relative w-full h-0.5 bg-gray-700">
                {/* "Now" Marker */}
                <div className="absolute top-1/2 -translate-y-1/2" style={{ left: `${getPosition(now)}%` }}>
                    <div className="relative">
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-blue-400">Now</span>
                    </div>
                </div>

                {/* Event Dots */}
                {events.map((event, index) => (
                    <div
                        key={index}
                        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 group"
                        style={{ left: `${getPosition(new Date(event.date))}%` }}
                        onMouseEnter={() => setHighlightedEvent(event.date)}
                        onMouseLeave={() => setHighlightedEvent(null)}
                    >
                        <div className={`w-2.5 h-2.5 rounded-full cursor-pointer transition-colors ${event.isPast ? 'bg-gray-500' : 'bg-blue-500'}`} />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-max max-w-xs bg-gray-800/80 backdrop-blur-sm text-white text-center p-2 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            <span className="block text-xs font-semibold">{event.event}</span>
                            <small className="block text-[10px] opacity-80">{formatRelativeDate(event.date, event.time)}</small>
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

const EventCalendar: React.FC<{ data: CalendarData | null }> = ({ data }) => {
    const [highlightedEvent, setHighlightedEvent] = useState<string | null>(null);

    if (!data) {
        return <div className="bg-[#1a1a1a] rounded-xl p-6 border border-white/5 shadow-md flex items-center justify-center min-h-[400px]">Loading...</div>;
    }

    const getImpactClass = (impact: CalendarEvent['impact']) => {
        switch (impact) {
            case 'High': return 'text-red-500 font-bold';
            case 'Medium': return 'text-orange-400 font-bold';
            case 'Low': return 'text-green-500 font-bold';
            default: return 'text-gray-400';
        }
    };

    return (
        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-white/5 shadow-md flex flex-col h-full">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white m-0">Economic & Event Calendar</h3>
            </div>

            <EventTimeline events={data.events} setHighlightedEvent={setHighlightedEvent} />

            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                    <thead>
                    <tr>
                        {['Date', 'Time (UTC)', 'Event', 'Impact', 'Forecast', 'Actual'].map(header => (
                            <th key={header} className="p-3 border-b border-white/10 text-left font-medium text-gray-400 text-xs">
                                {header}
                            </th>
                        ))}
                    </tr>
                    </thead>
                    <tbody>
                    {data.events.map((event, index) => (
                        <tr
                            key={index}
                            className={`transition-colors ${event.date === highlightedEvent ? 'bg-white/10' : ''} ${event.isPast ? 'text-gray-500' : ''}`}
                        >
                            <td className="p-3 border-b border-white/10">{event.date.replaceAll('-', '.')}</td>
                            <td className="p-3 border-b border-white/10">{event.time.replace(' UTC', '')}</td>
                            <td className={`p-3 border-b border-white/10 ${event.isPast ? '' : 'text-white'}`}>{event.event}</td>
                            <td className={`p-3 border-b border-white/10 ${getImpactClass(event.impact)}`}>{event.impact}</td>
                            <td className="p-3 border-b border-white/10">{event.forecast}</td>
                            <td className="p-3 border-b border-white/10">{event.actual}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default EventCalendar;
