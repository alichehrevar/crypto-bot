// ───────────────────────────────────────────────────────────────────────────────
// components/market/tabs/SentimentEventsTab.tsx
// ───────────────────────────────────────────────────────────────────────────────
'use client';

import React, { useState } from 'react';

import CardHeader from '../shared/CardHeader';
import EventTimeline from '../shared/EventTimeline';

export default function SentimentEventsTab({ data }: { data: any }) {
    const [highlightedEvent, setHighlightedEvent] = useState<number | null>(null);

    const SentimentCell = ({ value }: { value: 'Positive'|'Negative'|'Neutral' }) => {
        let color = '#9E9E9E';

        if (value === 'Positive') color = '#4CAF50';
        if (value === 'Negative') color = '#F44336';

        return <span style={{ color, fontWeight: 500 }}>{value}</span>;
    };

    return (
        <div className="grid sentimentGrid">
            <div className="card fullWidth">
                <CardHeader infoContent="Upcoming macro & crypto events." infoTitle="About the Event Calendar" title="Economic Catalysts & Event Calendar" />
                <EventTimeline events={data.events} setHighlightedEvent={setHighlightedEvent} />
                <table className="dataTable eventTable">
                    <thead><tr><th>Date</th><th>Time (UTC)</th><th>Event</th><th>Impact</th><th>Forecast</th><th>Actual</th></tr></thead>
                    <tbody>
                    {data.events.map((e: any) => (
                        <tr key={e.id} className={`${e.id===highlightedEvent?'highlighted-event':''} ${e.isPast?'past-event':''}`}>
                            <td>{e.date}</td>
                            <td>{e.time.split(' ')[0]}</td>
                            <td>{e.event}</td>
                            <td className={e.impact==='High'? 'highImpact' : 'neutral'}>{e.impact}</td>
                            <td>{e.forecast}</td>
                            <td className={e.isPast && e.actual!==e.forecast ? (parseFloat(e.actual) > parseFloat(e.forecast) ? 'positive' : 'negative') : ''}>{e.actual}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            <div className="card fullWidth">
                <CardHeader infoContent="Mentions change & Z-Score." infoTitle="About Trending Topics" title="Trending Topics (Social Volume Analysis)" />
                <div className="tableContainer">
                    <table className="dataTable topicsTable">
                        <thead><tr><th>Topic</th><th>24h mentions (%)</th><th>30D Z-Score</th><th>Sentiment</th><th>Linked assets</th><th>30d trend</th></tr></thead>
                        <tbody>
                        {data.trendingTopics.map((t: any) => (
                            <tr key={t.text}>
                                <td>{t.text}</td>
                                <td className={t.mentionChange>=0?'positive':'negative'}>{t.mentionChange.toFixed(2)}%</td>
                                <td>{t.zScore.toFixed(2)}</td>
                                <td><SentimentCell value={t.sentiment} /></td>
                                <td>{t.linkedAssets.join(', ')}</td>
                                <td>{/* Could reuse NivoSparkline here if desired */}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
