// ───────────────────────────────────────────────────────────────────────────────
// app/(authenticated)/profile/market/page.tsx
// ───────────────────────────────────────────────────────────────────────────────

'use client';

import React from 'react';
// import dynamic from 'next/dynamic';

// Lazy-load the heavy dashboard to reduce initial route JS
// const MarketDashboard = dynamic(() => import('@/components/market/MarketDashboard'), {
//     ssr: false,
//     loading: () => <div className="p-8 text-gray-400">Loading Market Dashboard…</div>,
// });

export default function Page() {
    return (
        <div className="min-h-[50shv] flex items-center justify-center font-bold text-[18px]">Market Page</div>
    );
}
