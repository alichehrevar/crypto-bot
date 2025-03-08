// app/components/LiveBotUpdates.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LiveBot } from '@/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/api/ws';

export default function LiveBotUpdates() {
    const [bots, setBots] = useState<LiveBot[]>([]);
    const router = useRouter();

    // Placeholder handlers for Pause/Resume and Cancel actions.
    const handlePauseResume = (botId: string) => {
        console.log(`Toggle pause/resume for bot ${botId}`);
    };

    const handleCancel = (botId: string) => {
        console.log(`Cancel bot ${botId}`);
    };

    useEffect(() => {
        // Connect to the WebSocket server.
        const ws = new WebSocket(WS_URL);

        ws.onopen = () => {
            console.log('Live Bot Updates WebSocket connected');
        };

        // Handle incoming messages.
        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'bot_update') {
                    setBots((prevBots) => {
                        const index = prevBots.findIndex((bot) => bot.id === message.data.id);
                        if (index !== -1) {
                            const updated = [...prevBots];
                            updated[index] = message.data;
                            return updated;
                        } else {
                            return [...prevBots, message.data];
                        }
                    });
                }
            } catch (error) {
                console.error('Error processing WebSocket message:', error);
            }
        };

        // Improved error logging.
        ws.onerror = (event: Event) => {
            let errorMsg = '';
            if (event instanceof ErrorEvent) {
                errorMsg = event.message;
            } else {
                try {
                    errorMsg = JSON.stringify(event);
                } catch (err) {
                    errorMsg = event.toString();
                }
            }
            console.error('Bot update WebSocket error:', errorMsg);
        };

        ws.onclose = () => {
            console.log('Live Bot Updates WebSocket disconnected');
        };

        return () => {
            ws.close();
        };
    }, []);

    return (
        <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Live Bot Updates</h2>
            {bots.length > 0 ? (
                <ul className="space-y-4">
                    {bots.map((bot) => (
                        <li key={bot.id} className="border p-4 rounded">
                            <p><strong>Bot:</strong> {bot.name}</p>
                            <p><strong>Status:</strong> {bot.status}</p>
                            <p><strong>Strategy:</strong> {bot.strategy}</p>
                            <p><strong>Symbol:</strong> {bot.symbol}</p>
                            <p><strong>Trade Fund (%):</strong> {bot.tradeFund}%</p>
                            <p><strong>Leverage:</strong> {bot.leverage}x</p>
                            <p><strong>Risk Criterion:</strong> {bot.riskCriterion}</p>
                            <p><strong>Technical Value:</strong> {bot.technicalValue}</p>
                            <p><strong>Signal:</strong> {bot.signal}</p>
                            <p><strong>PnL:</strong> {bot.pnl}</p>
                            <div className="flex gap-4 mt-2">
                                <button
                                    onClick={() => handlePauseResume(bot.id)}
                                    className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                                >
                                    Pause/Resume
                                </button>
                                <button
                                    onClick={() => handleCancel(bot.id)}
                                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                                >
                                    Cancel
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p>No live bot updates available.</p>
            )}
        </div>
    );
}
