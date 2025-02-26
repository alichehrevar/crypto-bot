'use client';

import React, { useEffect, useState } from 'react';

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
    cumulativePnL: number;
    botTP: number;
    botSL: number;
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

export default function BotUpdates({ initialBots }: BotUpdatesProps) {
    const [bots, setBots] = useState<Bot[]>(initialBots);

    useEffect(() => {
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/api/ws';
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('Connected to live updates WebSocket');
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'bot_update' && message.data) {
                    const updatedBot: Bot = message.data;
                    setBots((prevBots) => {
                        const index = prevBots.findIndex((b) => b.id === updatedBot.id);
                        if (index >= 0) {
                            const newBots = [...prevBots];
                            newBots[index] = updatedBot;
                            return newBots;
                        }
                        return prevBots;
                    });
                }
            } catch (err) {
                console.error('Error parsing WebSocket message:', err);
            }
        };

        ws.onerror = (err) => {
            console.error('WebSocket error:', err);
        };

        ws.onclose = () => {
            console.log('WebSocket connection closed');
        };

        return () => {
            ws.close();
        };
    }, []);

    return (
        <div>
            <ul className="space-y-4">
                {bots.map((bot) => (
                    <li key={bot.id} className="p-4 border rounded shadow">
                        <h3 className="font-bold">{bot.name}</h3>
                        <p>
                            <strong>Symbol:</strong> {bot.symbol}
                        </p>
                        <p>
                            <strong>Strategy:</strong> {bot.strategy}
                        </p>
                        <p>
                            <strong>Timeframe:</strong> {bot.timeframe}
                        </p>
                        <p>
                            <strong>Signal:</strong> {bot.marketInfo?.lastSignal || 'HOLD'}
                        </p>
                        <p>
                            <strong>Last Closed Price:</strong>{' '}
                            {bot.marketInfo?.lastCandle ? bot.marketInfo.lastCandle.close : 'N/A'}
                        </p>
                        <p>
                            <strong>Live Price:</strong>{' '}
                            {bot.marketInfo?.currentCandle ? bot.marketInfo.currentCandle.price : 'N/A'}
                        </p>
                    </li>
                ))}
            </ul>
        </div>
    );
}
