// app/methods/default/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BotConfigForm, { BotConfig } from '@/components/BotConfigForm';
import BotList from '@/components/BotList';
import LiveBotUpdates from '@/components/LiveBotUpdates';
import { Bot } from '@/types';

export default function DefaultMethodPage() {
    const router = useRouter();
    const [deployedBots, setDeployedBots] = useState<Bot[]>([]);
    const [refresh, setRefresh] = useState(false);
    const [view, setView] = useState<'deployed' | 'live'>('deployed'); // navigation toggle
    const [error, setError] = useState('');

    // Fetch deployed bots from the backend when the page mounts or refresh flag changes.
    useEffect(() => {
        async function fetchDeployedBots() {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000/api';
                const res = await fetch(`${apiUrl}/bots`);
                if (!res.ok) {
                    throw new Error('Failed to fetch deployed bots');
                }
                const data = await res.json();
                setDeployedBots(data);
            } catch (err) {
                console.error('Error fetching deployed bots:', err);
            }
        }
        fetchDeployedBots();
    }, [refresh]);

    // Handler for bot deployment.
    const handleBotDeploy = async (config: BotConfig) => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000/api';
            const res = await fetch(`${apiUrl}/bots/deploy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
            });
            if (res.ok) {
                const data = await res.json();
                console.log('Bot deployed:', data);
                // Toggle refresh to re-fetch the deployed bots.
                setRefresh((prev) => !prev);
            } else {
                const errData = await res.json();
                setError(errData.error || 'Failed to deploy bot');
            }
        } catch (err) {
            setError('An unexpected error occurred while deploying the bot');
        }
    };

    return (
        <div className="container mx-auto p-4 max-w-3xl">
            <h1 className="text-3xl font-bold mb-6">Deploy New Bot</h1>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            {/* Bot configuration form */}
            <BotConfigForm onDeploy={handleBotDeploy} />

            {/* Navigation for switching between deployed bots and live updates */}
            <div className="mt-8 flex gap-4">
                <button
                    onClick={() => setView('deployed')}
                    className={`px-4 py-2 rounded ${view === 'deployed' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
                >
                    Deployed Bots
                </button>
                <button
                    onClick={() => setView('live')}
                    className={`px-4 py-2 rounded ${view === 'live' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
                >
                    Live Updates
                </button>
            </div>

            {/* Render content based on selected view */}
            {view === 'deployed' ? (
                <BotList bots={deployedBots} />
            ) : (
                <LiveBotUpdates />
            )}
        </div>
    );
}
