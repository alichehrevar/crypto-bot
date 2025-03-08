// app/methods/optimized/live/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bot } from '@/types';
import { getApiClient } from '@/lib/api';

const LiveUpdatesPage: React.FC = () => {
    const [liveBots, setLiveBots] = useState<Bot[]>([]);
    const api = getApiClient();

    // For now, we simulate live updates by re-fetching the deployed bots.
    // In a real application, you might subscribe to a WebSocket.
    const fetchLiveBots = async () => {
        try {
            const res = await api.get<Bot[]>('/bots');
            setLiveBots(res.data);
        } catch (error) {
            console.error('Error fetching live bot updates:', error);
        }
    };

    useEffect(() => {
        fetchLiveBots();
        // Optionally set an interval to refresh live data.
        const interval = setInterval(() => {
            fetchLiveBots();
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-8">Live Bot Updates</h1>
            <nav className="mb-8">
                <Link href="/methods/optimized" className="mr-4 text-blue-500 hover:underline">
                    Back to Optimized Strategy
                </Link>
                <Link href="/methods/optimized/deployed" className="mr-4 text-blue-500 hover:underline">
                    Deployed Bots
                </Link>
            </nav>
            {liveBots.length > 0 ? (
                <ul className="space-y-4">
                    {liveBots.map((bot) => (
                        <li key={bot.id || bot._id} className="border p-4 rounded">
                            <p><strong>Name:</strong> {bot.name}</p>
                            <p><strong>Status:</strong> {bot.active ? 'Active' : 'Inactive'}</p>
                            <p><strong>Strategy:</strong> {bot.strategy}</p>
                            <p><strong>Symbol:</strong> {bot.symbol}</p>
                            <p><strong>Trade Fund (%):</strong> {bot.marketInfo?.tradeFund !== undefined ? `${bot.marketInfo.tradeFund}%` : 'N/A'}</p>
                            <p><strong>Leverage:</strong> {bot.tradeInfo?.leverage ? `${bot.tradeInfo.leverage}x` : 'N/A'}</p>
                            <p><strong>Risk Criterion:</strong> {bot.riskStrategy}</p>
                            <p><strong>Technical Value:</strong> {/* Example: RSI value or similar */} {bot.marketInfo?.lastSignal ? `RSI: ${bot.marketInfo.lastSignal}` : 'N/A'}</p>
                            <p><strong>Signal:</strong> {bot.marketInfo?.lastSignal || 'HOLD'}</p>
                            <p><strong>PnL:</strong> {bot.cumulativePnL !== undefined ? bot.cumulativePnL.toLocaleString('en-EN') : 'N/A'}</p>
                        </li>
                    ))}
                </ul>
            ) : (
                <p>No live updates available.</p>
            )}
        </div>
    );
};

export default LiveUpdatesPage;
