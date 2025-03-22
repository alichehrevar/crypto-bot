// app/accounts/okx/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

export default function OkxAccountPage() {
    const [apiKey, setApiKey] = useState('');
    const [secretKey, setSecretKey] = useState('');
    const [passphrase, setPassphrase] = useState('');
    const [message, setMessage] = useState('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = Cookies.get("token");
            const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000/api';
            const res = await fetch(`${apiUrl}/accounts/okx`, { // proxy to backend API endpoint
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ apiKey, secretKey, passphrase }),
            });
            if (res.ok) {
                const data = await res.json();
                setMessage('OKX account linked successfully!');
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
            <h1 className="text-2xl font-bold mb-4">Link OKX Account</h1>
            {message && <p className="text-[13px] text-red-600">{message}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block mb-1">API Key:</label>
                    <input type="text" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full p-2 border rounded" />
                </div>
                <div>
                    <label className="block mb-1">Secret Key:</label>
                    <input type="text" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} className="w-full p-2 border rounded" />
                </div>
                <div>
                    <label className="block mb-1">Passphrase:</label>
                    <input type="text" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} className="w-full p-2 border rounded" />
                </div>
                <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded">Link OKX Account</button>
            </form>
        </div>
    );
}
