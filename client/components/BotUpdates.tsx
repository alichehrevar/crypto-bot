'use client';

import { useState, useEffect } from 'react';

export interface Bot {
    id: string;
    name: string;
    strategy: string;
    symbol: string;
    timeframe: string;
    active: boolean;
    marketInfo: {
        state: string;
        lastCandle?: {
            timestamp: string | Date;
            open: number;
            high: number;
            low: number;
            close: number;
            volume: number;
        };
        lastSignal?: string;
    };
}

interface BotUpdatesProps {
    initialBots: Bot[];
}

export default function BotUpdates({ initialBots }: BotUpdatesProps) {
    const [bots, setBots] = useState<Bot[]>(initialBots);

    // Reset bots state when the initialBots prop changes.
    useEffect(() => {
        setBots(initialBots);
    }, [initialBots]);

    // Reinitialize WebSocket when the initialBots (or symbol/timeframe) change.
    useEffect(() => {
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/api/ws';
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('Bot update WebSocket connection opened.');
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'bot_update' && message.data) {
                    const updatedBot: Bot = message.data;
                    setBots((prevBots) => {
                        const index = prevBots.findIndex((bot) => bot.id === updatedBot.id);
                        if (index !== -1) {
                            // Replace the existing bot.
                            const newBots = [...prevBots];
                            newBots[index] = updatedBot;
                            return newBots;
                        } else {
                            // Do NOT append new bots; ignore updates for bots not in the state.
                            return prevBots;
                        }
                    });
                }
            } catch (err) {
                console.error('Error parsing bot update message:', err);
            }
        };

        ws.onerror = (err) => {
            console.error('Bot update WebSocket error:', JSON.stringify(err));
        };

        ws.onclose = () => {
            console.log('Bot update WebSocket connection closed.');
        };

        return () => {
            ws.close();
        };
    }, [initialBots]); // Re-run this effect whenever initialBots change.

    return (
        <div>
            {bots.map((bot) => (
                <div key={bot.id} className="p-4 border rounded mb-2">
                    <h3 className="font-bold">{bot.name}</h3>
                    <p>Symbol: {bot.symbol}</p>
                    <p>Strategy: {bot.strategy}</p>
                    <p>Timeframe: {bot.timeframe}</p>
                    <p>Signal: {bot.marketInfo.lastSignal || 'HOLD'}</p>
                </div>
            ))}
        </div>
    );
}
