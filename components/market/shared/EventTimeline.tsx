// ───────────────────────────────────────────────────────────────────────────────
// components/market/shared/EventTimeline.tsx
// ───────────────────────────────────────────────────────────────────────────────
'use client';

import React from 'react';

type EventItem = { id: number; date: string; time: string; event: string; impact: 'High'|'Medium'|'Low'; isPast?: boolean };

export default function EventTimeline({ events, setHighlightedEvent }: { events: EventItem[]; setHighlightedEvent: (id: number | null) => void; }) {
    const timelineStart = new Date('2025-08-07');
    const timelineEnd = new Date('2025-08-30');
    const now = new Date('2025-08-13T12:00:00Z');
    const total = timelineEnd.getTime() - timelineStart.getTime();
    const pos = (d: string | Date) => {
        const t = new Date(d).getTime() - timelineStart.getTime();

        return (t / total) * 100;
    };
    const nowPos = Math.max(0, Math.min(100, pos(now)));

    return (
        <div className="eventTimelineContainer">
            <div className="eventTimeline">
                <div className="eventTimelineNow" style={{ left: `${nowPos}%` }}>
                    <div className="eventTimelineNowMarker" />
                    <span className="eventTimelineNowLabel">Now</span>
                </div>
                {events.map(e => (
                    <div
                        key={e.id}
                        aria-label={`Event: ${e.event} on ${e.date}`}
                        className={`eventTimelineDot ${e.isPast ? 'past' : ''} impact-${e.impact.toLowerCase()}`}
                        role="button"
                        style={{ left: `${pos(e.date)}%` }}
                        tabIndex={0}
                        onMouseEnter={() => setHighlightedEvent(e.id)}
                        onMouseLeave={() => setHighlightedEvent(null)}
                    >
                        <div className="eventTimelineTooltip">
                            <strong>{e.event}</strong><br/>
                            <small>{e.date} {e.time}</small>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
