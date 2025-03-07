// components/BotUpdates.tsx
'use client';

import React, { useEffect, useState } from 'react';

// Bot interface updated to include optional marketInfo properties.
export interface Bot {
    id: string;
    name: string;
    strategy: string;
    symbol: string;
    timeframe: string;
    indicator?: string;
    riskStrategy?: string;
    baseFund: number;
    tradeFund: number;
    leverage: number;
    marketInfo?: {
        lastSignal?: string;
        lastCandle?: {
            close: number;
        };
        currentCandle?: {
            price: number;
        };
    } | null;
}

interface BotUpdatesProps {
    initialBots: Bot[];
}

/**
 * BotUpdates subscribes to live updates via WebSocket and updates the state
 * to reflect current candle price and signal for each bot.
 */
export default function BotUpdates({ initialBots }: BotUpdatesProps) {
    const [bots, setBots] = useState<Bot[]>(initialBots);

    useEffect(() => {
        // Connect to the WebSocket endpoint.
        const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/api/ws');

        // When a message is received, parse it and update the corresponding bot.
        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                // We expect messages with type 'bot_update'
                if (message.type === 'bot_update' && message.data) {
                    setBots((prevBots) =>
                        prevBots.map((bot) =>
                            bot.id === message.data.id ? { ...bot, marketInfo: message.data.marketInfo } : bot
                        )
                    );
                }
            } catch (error) {
                console.error('Error processing WebSocket message:', error);
            }
        };

        ws.onerror = (error) => {
            console.error('Bot update WebSocket error:', error);
        };

        return () => {
            ws.close();
        };
    }, []);

    return (
        <div>
            {bots.map((bot) => (
                <div key={bot.id} className="p-4 border rounded mb-2">
                    <h3 className="font-bold">{bot.name}</h3>
                    <p><strong>Current Candle Price:</strong> {bot.marketInfo && bot.marketInfo.currentCandle ? bot.marketInfo.currentCandle.price : 'N/A'}</p>
                    <p><strong>Last Signal:</strong> {bot.marketInfo && bot.marketInfo.lastSignal ? bot.marketInfo.lastSignal : 'HOLD'}</p>
                </div>
            ))}
        </div>
    );
}
