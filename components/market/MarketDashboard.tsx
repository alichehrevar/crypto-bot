// ───────────────────────────────────────────────────────────────────────────────
// components/market/MarketDashboard.tsx
// ───────────────────────────────────────────────────────────────────────────────
'use client';

import React, { Suspense, useMemo, useState } from 'react';

import GlobalStyles from './shared/GlobalStyles';
import SummaryTab from './tabs/SummaryTab';
import MomentumRotation from './tabs/MomentumRotation';
import LiquidityFlowsTab from './tabs/LiquidityFlowsTab';
import SentimentEventsTab from './tabs/SentimentEventsTab';
import NewListingsTab from './tabs/NewListingsTab';

import { initializeMarketData } from '@/lib/market/mockData';

const LoadingSpinner = () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner" />
    </div>
);

export default function MarketDashboard() {
    const [activeTab, setActiveTab] = useState('summary');
    const marketData = useMemo(() => initializeMarketData(), []);

    const tabs = [
        { id: 'summary', label: 'Market Summary', render: () => <SummaryTab data={{ summary: marketData.summary, movers: marketData.movers }} /> },
        { id: 'momentum', label: 'Momentum & Rotation', render: () => <MomentumRotation moversData={marketData.movers} sectorsData={marketData.sectors} /> },
        { id: 'liquidity', label: 'Liquidity & Flows', render: () => <LiquidityFlowsTab data={marketData.liquidity} /> },
        { id: 'sentiment', label: 'Sentiment & Events', render: () => <SentimentEventsTab data={marketData.sentiment} /> },
        { id: 'listings', label: 'New Listings', render: () => <NewListingsTab data={marketData.listings} /> },
    ];

    const Active = tabs.find(t => t.id === activeTab);

    return (
        <div className="pageContainer">
            <GlobalStyles />
            <header className="header"><h1 className="title">Advanced Market Analysis</h1></header>
            <nav className="tabNav">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        aria-selected={activeTab === tab.id}
                        className={`tabButton ${activeTab === tab.id ? 'tabButtonActive' : ''}`}
                        role="tab"
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>
            <main key={activeTab} className="tabContent" role="tabpanel">
                <Suspense fallback={<LoadingSpinner />}>{Active?.render()}</Suspense>
            </main>
        </div>
    );
}
