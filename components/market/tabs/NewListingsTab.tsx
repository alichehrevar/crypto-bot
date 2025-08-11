// ───────────────────────────────────────────────────────────────────────────────
// components/market/tabs/NewListingsTab.tsx
// ───────────────────────────────────────────────────────────────────────────────
'use client';

import React from 'react';

import CardHeader from '../shared/CardHeader';

export default function NewListingsTab({ data }: { data: any }) {
    return (
        <div className="grid listingsGrid">
            <div className="card">
                <CardHeader infoContent="Timeline of listings & TGEs." infoTitle="About Upcoming Listings" title="Upcoming Listings & TGE Timeline" />
                <div className="timeline">
                    {data.upcoming.map((it: any) => (
                        <div key={it.id} className="timelineItem">
                            <div className="timelineDate">{it.date}</div>
                            <div className="timelineContent">
                                <div className="timelineAsset">{it.asset}</div>
                                <div className="timelineType"><strong>{it.type}</strong> | Exchanges: {it.exchange}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="card">
                <CardHeader infoContent="Post-launch ROI & momentum." infoTitle="About Launch Performance" title="Recent Launch Performance Tracker" />
                <table className="dataTable launchTable">
                    <thead><tr><th>Asset</th><th>Launch date</th><th>Launch price</th><th>Current price</th><th>ROI (%)</th><th>Velocity</th></tr></thead>
                    <tbody>
                    {data.recent.map((it: any) => {
                        const change = ((it.currentPrice - it.launchPrice) / it.launchPrice) * 100;

                        return (
                            <tr key={it.asset}>
                                <td>{it.asset}</td>
                                <td>{it.launchDate}</td>
                                <td>${it.launchPrice.toFixed(2)}</td>
                                <td>${it.currentPrice.toFixed(2)}</td>
                                <td className={change>=0?'positive':'negative'}>{change.toFixed(2)}%</td>
                                <td className={it.velocity.includes('High') ? 'highImpact' : ''}>{it.velocity}</td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
