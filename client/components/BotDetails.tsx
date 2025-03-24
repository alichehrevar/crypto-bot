// app/components/BotDetails.tsx
'use client';

import React, { useEffect, useState } from 'react';

// Define an interface for a position.
export interface Position {
    position: number;
    date: string;
    status: 'open' | 'closed';
    amount: number;
    side: 'BUY' | 'SELL';
    openPrice: number;
    closePrice?: number;
    result: string; // e.g., "win (+100%)" or "loss (-100%)"
}

// Define an interface for bot details.
export interface BotDetailsData {
    id: string;
    name: string;
    positions: Position[];
}

interface BotDetailsProps {
    botId: string;
}

/**
 * BotDetails component displays detailed information for a single bot.
 * It fetches position data from the backend and renders each trade position.
 */
export default function BotDetails({ botId }: BotDetailsProps) {
    const [positions, setPositions] = useState<Position[]>([]);
    const [error, setError] = useState('');

    // Fetch positions for this bot.
    useEffect(() => {
        async function fetchPositions() {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000/api';
                const res = await fetch(`${apiUrl}/bots/${botId}/positions`);
                if (!res.ok) {
                    throw new Error('Failed to fetch positions');
                }
                const data = await res.json();
                setPositions(data);
            } catch (err) {
                setError('Error fetching positions');
                console.error(err);
            }
        }
        fetchPositions();
    }, [botId]);

    return (
        <div className="container mx-auto p-4 max-w-3xl">
            <h1 className="text-3xl font-bold mb-6">Bot Details</h1>
            {error && <p className="text-red-500">{error}</p>}
            <div className="mb-4">
                <h2 className="text-xl font-bold">Positions</h2>
                {positions.length > 0 ? (
                    <table className="w-full border-collapse">
                        <thead>
                        <tr>
                            <th className="border p-2">Position</th>
                            <th className="border p-2">Date</th>
                            <th className="border p-2">Status</th>
                            <th className="border p-2">Amount</th>
                            <th className="border p-2">Side</th>
                            <th className="border p-2">Open Price</th>
                            <th className="border p-2">Close Price</th>
                            <th className="border p-2">Result</th>
                        </tr>
                        </thead>
                        <tbody>
                        {positions.map((pos, index) => (
                            <tr key={index}>
                                <td className="border p-2">{pos.position}</td>
                                <td className="border p-2">{pos.date}</td>
                                <td className="border p-2">{pos.status}</td>
                                <td className="border p-2">{pos.amount}</td>
                                <td className="border p-2">{pos.side}</td>
                                <td className="border p-2">{pos.openPrice}</td>
                                <td className="border p-2">{pos.closePrice ?? 'N/A'}</td>
                                <td className="border p-2">{pos.result}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                ) : (
                    <p>No positions found for this bot.</p>
                )}
            </div>
            <div className="flex gap-4">
                <button
                    onClick={() => console.log('Pause/Resume clicked')}
                    className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                    Pause/Resume
                </button>
                <button
                    onClick={() => console.log('Cancel clicked')}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                    Cancel Bot
                </button>
            </div>
        </div>
    );
}
