// ───────────────────────────────────────────────────────────────────────────────
// components/market/shared/CardHeader.tsx
// ───────────────────────────────────────────────────────────────────────────────
'use client';

import React from 'react';

import InfoButton from './InfoButton';

export default function CardHeader({ title, infoTitle, infoContent, children }: { title: string; infoTitle?: string; infoContent?: string; children?: React.ReactNode; }) {
    return (
        <div className="cardHeader">
            <div className="cardTitleContainer">
                <h3 className="cardTitle">{title}</h3>
                {infoTitle && infoContent && <InfoButton content={infoContent} title={infoTitle} />}
            </div>
            {children}
        </div>
    );
}
