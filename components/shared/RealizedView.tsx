import type {RealizedPoint} from "@/types/profile/PnLTypes";

import React, {useId, useMemo} from "react";
import {
    ResponsiveContainer,
    BarChart as RBarChart,
    Bar,
    XAxis,
    Tooltip,
} from 'recharts';

const weekdayShort = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const labelOf = (d: any, i: number) => {
    if (d?.day) return d.day;
    if (d?.label) return d.label;
    if (d?.date) return new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' });
    if (typeof d?.time === 'number') return new Date(d.time).toLocaleDateString(undefined, { weekday: 'short' });

    return weekdayShort[i % 7];
};

const valueOf = (d: any) => Number(d?.value ?? d?.pnl ?? d?.amount ?? 0);

export default function RealizedView({ data }: { data: RealizedPoint[] }) {
    const gradId = useId();

    // determine if we truly have any real bars to show
    const hasData = Array.isArray(data) && data.some((d) => valueOf(d) !== 0);

    // when no data, render 7 placeholder bars with dashed stroke + weekday labels
    const placeholder = useMemo(
        () =>
            weekdayShort.map((d, i) => ({
                day: d,
                value: [82, 96, 58, 36, 44, 40, 92][i], // static heights for a nice skeleton rhythm
                __placeholder: true as const,
            })),
        []
    );

    const bars = useMemo(
        () =>
            hasData
                ? (data ?? []).map((d, i) => ({
                    day: labelOf(d, i),
                    value: valueOf(d),
                    __placeholder: false as const,
                }))
                : placeholder,
        [data, hasData, placeholder]
    );

    // custom tooltip – hidden for skeleton rows
    const CustomTooltip = ({ active, payload }: any) => {
        if (!active || !payload?.length) return null;
        const row = payload[0].payload;

        if (row.__placeholder) return null;
        const usd = Number(row.value) || 0;

        return (
            <div className="bg-gray-800/60 backdrop-blur-md border border-white/20 text-white p-2.5 rounded-lg shadow-lg">
                <div className="font-medium text-xs">${usd.toLocaleString()}</div>
            </div>
        );
    };

    // custom rectangle so we can render dashed placeholders nicely
    const BarShape = (props: any) => {
        const { x, y, width, height, payload } = props;
        const radius = 8;

        if (payload.__placeholder) {
            return (
                <rect
                    fill="transparent"
                    height={height}
                    rx={radius}
                    ry={radius}
                    stroke="#6b7280"
                    strokeDasharray="6 6"
                    strokeOpacity="0.6"
                    width={width}
                    x={x}
                    y={y}
                />
            );
        }

        return <rect fill={`url(#${gradId})`} height={height} rx={radius} ry={radius} width={width} x={x} y={y} />;
    };

    return (
        <ResponsiveContainer height="100%" width="100%">
            <RBarChart barGap={8} data={bars} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
                <defs>
                    <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.85} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.95} />
                    </linearGradient>
                </defs>
                <XAxis
                    axisLine={false}
                    dataKey="day"
                    dy={8}
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={false} />
                <Bar barSize={32} dataKey="value" shape={<BarShape />} />
            </RBarChart>
        </ResponsiveContainer>
    );
}
