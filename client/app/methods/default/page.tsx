'use client';

import React, { useEffect, useState } from 'react';
import BotConfigForm from '@/components/BotConfigForm';
import BotUpdates, { Bot } from '@/components/BotUpdates';

/**
 * DefaultMethodPage is the main page for deploying new bots and displaying
 * currently deployed bots along with their live updates.
 */
export default function DefaultMethodPage() {
    // State to store deployed bots and a flag to trigger refresh.
    const [deployedBots, setDeployedBots] = useState<Bot[]>([]);
    const [refresh, setRefresh] = useState(false);

    /**
     * fetchDeployedBots fetches the current list of deployed bots from the backend.
     */
    const fetchDeployedBots = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000/api';
            const res = await fetch(`${apiUrl}/bots`, { cache: 'no-store' });
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

    // Fetch deployed bots on initial load and whenever refresh changes.
    useEffect(() => {
        fetchDeployedBots();
    }, [refresh]);

    /**
     * handleBotDeploy is called when the BotConfigForm is submitted.
     * It sends the new bot configuration to the backend and refreshes the list.
     */
    const handleBotDeploy = async (config: any) => {
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
                // Read and log the error response for better debugging.
                const errorText = await res.text();
                console.error('Failed to deploy bot:', errorText);
            }
        } catch (error) {
            console.error('Error deploying bot:', error);
        }
    };


    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Deploy New Bot</h1>
            {/* BotConfigForm contains fields such as base fund, trade fund, leverage, risk strategy, indicator, etc. */}
            <BotConfigForm onDeploy={handleBotDeploy} />

            <h2 className="text-xl font-bold mt-8">Deployed Bots</h2>
            <ul className="mt-4 space-y-4">
                {deployedBots.map((bot: Bot, index) => (
                    <li key={bot.id || index} className="border p-4 rounded">
                        <p><strong>Name:</strong> {bot.name}</p>
                        <p><strong>Symbol:</strong> {bot.symbol}</p>
                        <p><strong>Timeframe:</strong> {bot.timeframe}</p>
                        <p><strong>Indicator:</strong> {bot.indicator || 'N/A'}</p>
                        <p><strong>Risk Strategy:</strong> {bot.riskStrategy || 'N/A'}</p>
                        <p><strong>Strategy:</strong> {bot.strategy}</p>
                        <p><strong>Base Fund ($):</strong> {bot.baseFund}</p>
                        <p><strong>Trade Fund (%):</strong> {bot.tradeFund}%</p>
                        <p><strong>Leverage:</strong> {bot.leverage}x</p>
                        <p>
                            <strong>Last Signal:</strong>{' '}
                            {bot.marketInfo && bot.marketInfo.lastSignal ? bot.marketInfo.lastSignal : 'HOLD'}
                        </p>
                        <p>
                            <strong>Last Closed Candle Price:</strong>{' '}
                            {bot.marketInfo && bot.marketInfo.lastCandle ? bot.marketInfo.lastCandle.close : 'N/A'}
                        </p>
                        <p>
                            <strong>Current Candle Price:</strong>{' '}
                            {bot.marketInfo && bot.marketInfo.currentCandle ? bot.marketInfo.currentCandle.price : 'N/A'}
                        </p>
                    </li>
                ))}
            </ul>

            {/* BotUpdates component subscribes to live updates and displays real-time changes. */}
            <h2 className="text-xl font-bold mt-8">Live Bot Updates</h2>
            <BotUpdates initialBots={deployedBots} />
        </div>
    );
}
