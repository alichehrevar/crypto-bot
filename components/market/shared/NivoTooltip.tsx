// ───────────────────────────────────────────────────────────────────────────────
// components/market/shared/NivoTooltip.tsx
// ───────────────────────────────────────────────────────────────────────────────
'use client';

import React from 'react';

import { nivoDarkTheme } from './NivoTheme';

export default function NivoTooltip({ children }: { children: React.ReactNode }) {
    return <div style={nivoDarkTheme.tooltip.container as React.CSSProperties}>{children}</div>;
}
