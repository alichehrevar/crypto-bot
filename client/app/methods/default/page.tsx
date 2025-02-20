// app/methods/default/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import BotConfigForm from '@/components/BotConfigForm';
import { Bot } from '@/components/BotUpdates';

export default function DefaultMethodPage() {
    const [deployedBots, setDeployedBots] = useState<Bot[]>([]);
    const [refresh, setRefresh] = useState(false);

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
                console.error('Failed to deploy bot');
            }
        } catch (error) {
            console.error('Error deploying bot:', error);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Deploy New Bot</h1>
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
                    </li>
                ))}
            </ul>
        </div>
    );
}
