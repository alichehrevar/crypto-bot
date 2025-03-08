// app/methods/optimized/page.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import OptimizedBotConfigForm, { OptimizedBotConfig } from '@/components/OptimizedBotConfigForm';

const OptimizedStrategyPage: React.FC = () => {
    // Handler to deploy a new bot. You would typically call your API here.
    const handleDeploy = async (config: OptimizedBotConfig) => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000/api';
            const res = await fetch(`${apiUrl}/bots/deploy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
            });
            if (res.ok) {
                const newBot = await res.json();
                console.log('Bot deployed:', newBot);
                // Optionally show a success message or refresh data.
            } else {
                const errorText = await res.text();
                console.error('Failed to deploy bot:', errorText);
            }
        } catch (error) {
            console.error('Error deploying bot:', error);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-8">Optimized Strategy</h1>
            {/* Navigation Links */}
            <nav className="mb-8">
                <Link href="/methods/default" className="mr-4 text-blue-500 hover:underline">
                    Default Strategy
                </Link>
                <Link href="/methods/optimized/deployed" className="mr-4 text-blue-500 hover:underline">
                    Deployed Bots
                </Link>
                <Link href="/methods/optimized/live" className="mr-4 text-blue-500 hover:underline">
                    Live Updates
                </Link>
                <Link href="/methods/dynamic" className="mr-4 text-blue-500 hover:underline">
                    Dynamic Strategy
                </Link>
            </nav>
            {/* Optimized Bot Deployment Form */}
            <OptimizedBotConfigForm onDeploy={handleDeploy} />
        </div>
    );
};

export default OptimizedStrategyPage;
