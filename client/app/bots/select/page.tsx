'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BotSelectionPage() {
    const [currencies, setCurrencies] = useState<string[]>([]);
    const [symbol, setSymbol] = useState('');
    const [timeframe, setTimeframe] = useState('1h');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        async function fetchCurrencies() {
            try {
                // Use the backend URL from your environment variable or fallback.
                const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
                const res = await fetch(`${apiUrl}/currencies`, { cache: 'no-store' });
                if (!res.ok) {
                    throw new Error('Failed to fetch currencies');
                }
                const data = await res.json();
                // Expect the backend to return an object { success: true, data: [<currency1>, <currency2>, ...] }
                if (data.success && Array.isArray(data.data)) {
                    setCurrencies(data.data);
                    setSymbol(data.data[0] || '');
                } else {
                    throw new Error('Invalid data format from currencies endpoint');
                }
            } catch (err: any) {
                console.error('Error fetching currencies:', err);
                setError(err.message || 'Unknown error occurred');
            } finally {
                setLoading(false);
            }
        }
        fetchCurrencies();
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Navigate to the Bots page with the selected symbol and timeframe as query parameters.
        router.push(`/bots?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`);
    };

    if (loading) {
        return (
            <div className="container mx-auto p-4">
                <p>Loading currencies...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto p-4">
                <p className="text-red-500">Error: {error}</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Select Crypto and Timeframe</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="symbol">Crypto Symbol:</label>
                    <select
                        id="symbol"
                        value={symbol}
                        onChange={(e) => setSymbol(e.target.value)}
                        className="ml-2"
                    >
                        {currencies.map((curr) => (
                            <option key={curr} value={curr}>
                                {curr}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="timeframe">Timeframe:</label>
                    <select
                        id="timeframe"
                        value={timeframe}
                        onChange={(e) => setTimeframe(e.target.value)}
                        className="ml-2"
                    >
                        <option value="1m">1 Minute</option>
                        <option value="5m">5 Minutes</option>
                        <option value="15m">15 Minutes</option>
                        <option value="1h">1 Hour</option>
                        <option value="4h">4 Hours</option>
                        <option value="1d">1 Day</option>
                        <option value="1w">1 Week</option>
                    </select>
                </div>
                <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded">
                    Get Bot Data
                </button>
            </form>
        </div>
    );
}
