// app/methods/optimized/page.tsx
import React from 'react';
import Link from 'next/link';

export default function OptimizedStrategyPage() {
    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Optimized Strategy</h1>
            <p>This page is for the Optimized Strategy. Here you can deploy and monitor bots using parameter optimization.</p>
            <Link href="/dashboard">
                <span className="text-blue-600 hover:underline">Back to Dashboard</span>
            </Link>
        </div>
    );
}
