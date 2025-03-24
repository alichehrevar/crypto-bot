// app/dashboard/page.tsx
import React from 'react';
import Link from 'next/link';

/**
 * DashboardPage
 *
 * This page serves as the main dashboard for the trading system.
 * It provides three navigation links to different strategy pages:
 * - Default Strategy
 * - Optimized Strategy
 * - Dynamic Strategy
 *
 * Users can click on any link to navigate to the corresponding strategy page.
 */
export default function DashboardPage() {
    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-8">Trading Dashboard</h1>
            <nav className="mb-8">
                <ul className="flex flex-col gap-4">
                    <li>
                        <Link href="/methods/default">
                            <span className="text-blue-600 hover:underline">Default Strategy</span>
                        </Link>
                    </li>
                    <li>
                        <Link href="/methods/optimized">
                            <span className="text-blue-600 hover:underline">Optimized Strategy</span>
                        </Link>
                    </li>
                    <li>
                        <Link href="/methods/dynamic">
                            <span className="text-blue-600 hover:underline">Dynamic Strategy</span>
                        </Link>
                    </li>
                </ul>
            </nav>
            <h1 className="text-2xl font-bold mb-8">Account Links</h1>
            <nav className="mb-8">
                <ul className="flex flex-col gap-4">
                    <li>
                        <Link href="/accounts/okx">
                            <span className="text-green-700 hover:underline">OKX</span>
                        </Link>
                    </li>
                    <li>
                        <Link href="/accounts/binance">
                            <span className="text-green-700 hover:underline">Binance</span>
                        </Link>
                    </li>
                    <li>
                        <Link href="/accounts/bingx">
                            <span className="text-green-700 hover:underline">BingX</span>
                        </Link>
                    </li>
                </ul>
            </nav>
        </div>
    );
}
