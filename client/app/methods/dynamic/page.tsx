// app/methods/dynamic/page.tsx
import React from 'react';
import Link from 'next/link';

export default function DynamicStrategyPage() {
    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Dynamic Strategy</h1>
            <p>This page is for the Dynamic Strategy. Here you can deploy and monitor bots that update their parameters dynamically based on live market data.</p>
            <Link href="/dashboard">
                <span className="text-blue-600 hover:underline">Back to Dashboard</span>
            </Link>
        </div>
    );
}
