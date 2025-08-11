// ───────────────────────────────────────────────────────────────────────────────
// components/market/tabs/MomentumRotation/index.tsx
// ───────────────────────────────────────────────────────────────────────────────
'use client';

import React from 'react';

import MoversVolatilityTab from './MoversVolatilityTab';
import SectorsRotationTab from './SectorsRotationTab';

export default function MomentumRotation({ moversData, sectorsData }: { moversData: any; sectorsData: any }) {
    return (
        <>
            <MoversVolatilityTab data={moversData} />
            <SectorsRotationTab data={sectorsData} />
        </>
    );
}
