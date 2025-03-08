// app/methods/optimized/deployed/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bot } from '@/types'; // Ensure this type matches your Bot model
import { getApiClient } from '@/lib/api';

const DeployedBotsPage: React.FC = () => {
    const [bots, setBots] = useState<Bot[]>([]);
    const api = getApiClient();

    const fetchBots = async () => {
        try {
            const res = await api.get<Bot[]>('/bots');
            setBots(res.data);
        } catch (error) {
            console.error('Error fetching deployed bots:', error);
        }
    };

    useEffect(() => {
        fetchBots();
    }, []);

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-8">Deployed Bots</h1>
            <nav className="mb-8">
                <Link href="/methods/optimized" className="mr-4 text-blue-500 hover:underline">
                    Back to Optimized Strategy
                </Link>
                <Link href="/methods/optimized/live" className="mr-4 text-blue-500 hover:underline">
                    Live Updates
                </Link>
            </nav>
            {bots.length > 0 ? (
                <ul className="space-y-4">
                    {bots.map((bot) => (
                        <li key={bot.id || bot._id} className="border p-4 rounded">
                            <p><strong>Name:</strong> {bot.name}</p>
                            <p><strong>Symbol:</strong> {bot.symbol}</p>
                            <p><strong>Timeframe:</strong> {bot.timeframe}</p>
                            <p><strong>Indicator:</strong> {bot.indicator}</p>
                            <p><strong>Risk Strategy:</strong> {bot.riskStrategy}</p>
                            <p><strong>Strategy:</strong> {bot.strategy}</p>
                            <p><strong>Base Fund ($):</strong> {bot.marketInfo?.baseFund?.toLocaleString('en-EN') || 'N/A'}</p>
                            <p><strong>Trade Fund (%):</strong> {bot.marketInfo?.tradeFund !== undefined ? `${bot.marketInfo.tradeFund}%` : 'N/A'}</p>
                            <p><strong>Leverage:</strong> {bot.tradeInfo?.leverage ? `${bot.tradeInfo.leverage}x` : 'N/A'}</p>
                            <p><strong>Last Signal:</strong> {bot.marketInfo?.lastSignal || 'HOLD'}</p>
                            <p><strong>Last Closed Candle Price:</strong> {bot.marketInfo?.lastCandle?.close || 'N/A'}</p>
                            <p><strong>Current Candle Price:</strong> {bot.marketInfo?.currentCandle?.price || 'N/A'}</p>
                        </li>
                    ))}
                </ul>
            ) : (
                <p>No deployed bots found.</p>
            )}
        </div>
    );
};

export default DeployedBotsPage;
