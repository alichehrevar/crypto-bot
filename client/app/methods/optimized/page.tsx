'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import OptimizedStrategyForm, { BotConfig } from '@/components/OptimizedStrategyForm';

export default function OptimizedStrategyPage() {
    const router = useRouter();
    const [deployedBots, setDeployedBots] = useState<any[]>([]);
    const [refresh, setRefresh] = useState(false);

    // Fetch deployed bots from the backend.
    const fetchDeployedBots = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000/api';
            const res = await fetch(`${apiUrl}/bots`);
            if (res.ok) {
                const data = await res.json();
                setDeployedBots(data);
            } else {
                console.error('Failed to fetch deployed bots');
            }
        } catch (error) {
            console.error('Error fetching deployed bots:', error);
        }
    };

    useEffect(() => {
        fetchDeployedBots();
    }, [refresh]);

    // Handler to deploy a new bot.
    const handleBotDeploy = async (config: BotConfig) => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000/api';
            const res = await fetch(`${apiUrl}/bots/deploy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
            });
            if (res.ok) {
                const newBot = await res.json();
                console.log('Bot deployed:', newBot);
                setRefresh(!refresh);
            } else {
                const errorText = await res.text();
                console.error('Failed to deploy bot:', errorText);
            }
        } catch (error) {
            console.error('Error deploying bot:', error);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Optimized Strategy Deployment</h1>
            <OptimizedStrategyForm onDeploy={handleBotDeploy} />
            <div className="mt-8">
                <h2 className="text-2xl font-bold mb-4">Deployed Bots</h2>
                {deployedBots.length > 0 ? (
                    <ul className="space-y-4">
                        {deployedBots.map((bot) => (
                            <li key={bot._id} className="border p-4 rounded">
                                <p><strong>Name:</strong> {bot.name}</p>
                                <p><strong>Symbol:</strong> {bot.symbol}</p>
                                <p><strong>Timeframe:</strong> {bot.timeframe}</p>
                                <p><strong>Indicator:</strong> {bot.indicator || 'N/A'}</p>
                                <p><strong>Risk Strategy:</strong> {bot.riskStrategy || 'N/A'}</p>
                                <p><strong>Strategy:</strong> {bot.strategy}</p>
                                <p><strong>Base Fund ($):</strong> {bot.marketInfo?.baseFund.toLocaleString('en-US')}</p>
                                <p><strong>Trade Fund (%):</strong> {bot.marketInfo?.tradeFund || 'N/A'}</p>
                                <p><strong>Leverage:</strong> {bot.tradeInfo?.leverage ? `${bot.tradeInfo.leverage}x` : 'N/A'}</p>
                                <p><strong>Last Signal:</strong> {bot.marketInfo?.lastSignal || 'HOLD'}</p>
                                <p><strong>Last Closed Candle Price:</strong> {bot.marketInfo?.lastCandle ? bot.marketInfo.lastCandle.close : 'N/A'}</p>
                                <p><strong>Current Candle Price:</strong> {bot.marketInfo?.currentCandle ? bot.marketInfo.currentCandle.price : 'N/A'}</p>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>No deployed bots found.</p>
                )}
            </div>
        </div>
    );
}
