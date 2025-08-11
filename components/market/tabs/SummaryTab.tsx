// ───────────────────────────────────────────────────────────────────────────────
// components/market/tabs/SummaryTab.tsx
// ───────────────────────────────────────────────────────────────────────────────
'use client';

import React, { useMemo, useState } from 'react';
import { ResponsiveBar } from '@nivo/bar';

import CardHeader from '../shared/CardHeader';
import NivoTooltip from '../shared/NivoTooltip';
import { nivoDarkTheme } from '../shared/NivoTheme';

export default function SummaryTab({ data }: { data: any }) {
    const { summary, movers } = data;
    const [view, setView] = useState<'gainers'|'losers'>('gainers');
    const items = useMemo(() => (view === 'gainers' ? movers.gainers : movers.losers).slice(0, 6), [view, movers]);

    const BigMovers = () => (
        <ResponsiveBar
            enableLabel
            axisBottom={{ tickSize: 0, tickPadding: 10, legend: 'Asset', legendPosition: 'middle', legendOffset: 36 }}
            axisLeft={{ tickSize: 0, tickPadding: 10, format: (v: number) => `${Math.abs(v)}%`, legend: 'Change (%)', legendPosition: 'middle', legendOffset: -40 }}
            axisRight={null}
            axisTop={null}
            borderRadius={4}
            colors={[view === 'gainers' ? '#4CAF50' : '#F44336']}
            data={items}
            indexBy="asset"
            keys={['change']}
            label={d => `${Number(d.value).toFixed(2)}%`}
            labelSkipHeight={12}
            labelSkipWidth={12}
            labelTextColor={'#fff'}
            margin={{ top: 40, right: 20, bottom: 50, left: 50 }}
            padding={0.4}
            theme={nivoDarkTheme}
            tooltip={({ indexValue, value, color }) => (
                <NivoTooltip>
                    <strong>{indexValue}</strong><br/>
                    <span style={{ color: String(color) }}>Change: {Number(value).toFixed(2)}%</span>
                </NivoTooltip>
            )}
        />
    );

    const SentimentGauge = ({ score }: { score: number }) => {
        const radius = 100; const circ = Math.PI * radius; const s = Math.max(0, Math.min(100, score)); const off = circ * (1 - s/100);
        let label = 'Neutral', color = '#9E9E9E';

        if (s < 25) { label = 'Extreme Fear'; color = '#F44336'; }
        else if (s < 45) { label = 'Fear'; color = '#FF5722'; }
        else if (s > 75) { label = 'Extreme Greed'; color = '#4CAF50'; }
        else if (s > 55) { label = 'Greed'; color = '#8BC34A'; }

        return (
            <div className="gaugeContainer">
                <svg aria-label={`Market Sentiment: ${s} (${label})`} height="140" role="img" viewBox="0 0 240 140" width="240">
                    <defs>
                        <linearGradient id="gaugeGradient" x1="0%" x2="100%" y1="0%" y2="0%">
                            <stop offset="0%" stopColor="#F44336" />
                            <stop offset="50%" stopColor="#FFC107" />
                            <stop offset="100%" stopColor="#4CAF50" />
                        </linearGradient>
                    </defs>
                    <path d="M 20 120 A 100 100 0 0 1 220 120" fill="none" stroke="#333" strokeLinecap="round" strokeWidth="18" />
                    <path d="M 20 120 A 100 100 0 0 1 220 120" fill="none" stroke="url(#gaugeGradient)" strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" strokeWidth="18" style={{ transition: 'stroke-dashoffset 1.5s ease-out' }} />
                    <text fill={color} fontSize="32px" fontWeight={700} textAnchor="middle" x="120" y="95">{s}</text>
                    <text fill={color} fontSize="16px" fontWeight={600} textAnchor="middle" x="120" y="125">{label}</text>
                </svg>
            </div>
        );
    };

    return (
        <div className="grid summaryGrid">
            <div className="card aiCard">
                <div className="cardTitleContainer" style={{ gap: '.5rem' }}>
                    <svg aria-hidden className="sparkleIcon" height="24" viewBox="0 0 24 24" width="24">
                        <defs>
                            <linearGradient id="sparkleGradient" x1="0%" x2="100%" y1="0%" y2="100%">
                                <stop offset="0%" stopColor="#a96eff" />
                                <stop offset="100%" stopColor="#7693ff" />
                            </linearGradient>
                        </defs>
                        <path d="M12 2L14.09 8.26L20.36 9.27L15.73 14.14L16.82 20.42L12 17.27L7.18 20.42L8.27 14.14L3.64 9.27L9.91 8.26L12 2Z" fill="url(#sparkleGradient)"/>
                    </svg>
                    <h3 className="cardTitle">AI Market Analysis (Powered by Model)</h3>
                </div>
                <p className="aiAnalysisText">{summary.aiAnalysis}</p>
            </div>

            <div className="card">
                <CardHeader infoContent="This gauge, similar to a 'Fear & Greed Index', measures the dominant emotion in the market." infoTitle="About Market Sentiment" title="Fear & Greed Index" />
                <SentimentGauge score={summary.sentimentScore} />
            </div>

            <div className="card chartCard">
                <CardHeader infoContent="Top 6 gainers/losers by 24h % change." infoTitle="About Big Movers" title="Big Movers (24h)">
                    <div className="subTabs">
                        <button className={`subTabButton ${view==='gainers'?'active':''}`} onClick={() => setView('gainers')}>Gainers</button>
                        <button className={`subTabButton ${view==='losers'?'active':''}`} onClick={() => setView('losers')}>Losers</button>
                    </div>
                </CardHeader>
                <div className="chartContainer" style={{ height: 350 }}>
                    <BigMovers />
                </div>
            </div>

            <div className="card anomalyCard">
                <CardHeader infoContent="Flags events deviating from normal baselines." infoTitle="About the Anomaly Feed" title="Real-time Anomaly Feed" />
                <div className="anomalyFeed">
                    {summary.anomalyFeed.map((item: any) => (
                        <div key={item.id} className="anomalyItem">
                            <div className={`anomalyIcon severity-${item.severity.toLowerCase()}`}>
                                <svg fill="none" height="20" viewBox="0 0 24 24" width="20">
                                    <path d="M11 5L6 9H2V15H6L11 19V5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                                </svg>
                            </div>
                            <div className="anomalyContent">
                                <span className="anomalyDetail"><strong>{item.asset}:</strong> {item.detail}</span>
                                <span className="anomalyTime">{item.time}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
