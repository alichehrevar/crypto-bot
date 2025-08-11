'use client';

import React from 'react';

export default function MarketStatsLoading() {
    return (
        <div className="bg-dark-gray backdrop-blur-sm rounded-xl p-0.5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-6 w-full animate-pulse">
                    {/* Left: symbol avatar + name */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-700/70" />
                        <div className="space-y-1">
                            <div className="h-5 w-28 bg-gray-700/70 rounded" />
                            <div className="h-3 w-20 bg-gray-800/70 rounded" />
                        </div>
                    </div>

                    {/* Desktop skeleton stats */}
                    <div className="hidden lg:flex items-center gap-8 flex-1">
                        <div className="space-y-2">
                            <div className="h-7 w-28 bg-gray-700/70 rounded" />
                            <div className="h-3 w-16 bg-gray-800/70 rounded" />
                        </div>
                        <div className="space-y-2">
                            <div className="h-5 w-24 bg-gray-700/70 rounded" />
                            <div className="h-3 w-28 bg-gray-800/70 rounded" />
                        </div>
                        <div className="space-y-2">
                            <div className="h-5 w-24 bg-gray-700/70 rounded" />
                            <div className="h-3 w-20 bg-gray-800/70 rounded" />
                        </div>
                        <div className="space-y-2">
                            <div className="h-5 w-24 bg-gray-700/70 rounded" />
                            <div className="h-3 w-20 bg-gray-800/70 rounded" />
                        </div>
                        <div className="space-y-2">
                            <div className="h-5 w-24 bg-gray-700/70 rounded" />
                            <div className="h-3 w-24 bg-gray-800/70 rounded" />
                        </div>
                    </div>

                    {/* Mobile skeleton (price only) */}
                    <div className="lg:hidden space-y-2">
                        <div className="h-7 w-28 bg-gray-700/70 rounded" />
                        <div className="h-3 w-16 bg-gray-800/70 rounded" />
                    </div>
                </div>
            </div>
        </div>
    );
}
