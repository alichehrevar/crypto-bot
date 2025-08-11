// ───────────────────────────────────────────────────────────────────────────────
// components/market/shared/NivoSparkline.tsx
// ───────────────────────────────────────────────────────────────────────────────
'use client';

import React, { useMemo } from 'react';
import { ResponsiveLine } from '@nivo/line';

export default function NivoSparkline({ data, color }: { data: { x: number | string; y: number }[]; color: string }) {
    const series = useMemo(() => [{ id: 'sparkline', data }], [data]);

    return (
        <div style={{ width: 100, height: 30 }}>
            <ResponsiveLine
                animate={false}
                axisBottom={null}
                axisLeft={null}
                axisRight={null}
                axisTop={null}
                colors={[color]}
                curve="monotoneX"
                data={series}
                enableGridX={false}
                enableGridY={false}
                enablePoints={false}
                isInteractive={false}
                lineWidth={2}
                margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
                xScale={{ type: 'point' }}
                yScale={{ type: 'linear', stacked: false }}
            />
        </div>
    );
}
