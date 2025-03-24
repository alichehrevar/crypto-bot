// app/accounts/binance/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

export default function BinanceAccountPage() {
    const [apiKey, setApiKey] = useState('');
    const [secretKey, setSecretKey] = useState('');
    const [message, setMessage] = useState('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = Cookies.get("token");
            const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000/api';
            const res = await fetch(`${apiUrl}/accounts/bingx`, { // proxy to our backend API endpoint
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ apiKey, secretKey }),
            });
            if (res.ok) {
                const data = await res.json();
                setMessage('Binance account linked successfully!');
                // Optionally redirect or clear the form.
            } else {
                const errorData = await res.json();
                setMessage('Error: ' + errorData.error);
            }
        } catch (error) {
            setMessage('Unexpected error');
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Link BingX Account</h1>
            {message && <p>{message}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block mb-1">API Key:</label>
                    <input type="text" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full p-2 border rounded" />
                </div>
                <div>
                    <label className="block mb-1">Secret Key:</label>
                    <input type="text" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} className="w-full p-2 border rounded" />
                </div>
                <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded">Link BingX Account</button>
            </form>
        </div>
    );
}
