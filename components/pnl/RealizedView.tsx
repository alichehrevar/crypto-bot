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

const labelOf = (d: any, i: number): string => {
    if (d?.day) return d.day;
    if (d?.label) return d.label;
    if (d?.date) return d.date.split(' ')[0]; // Handles "Mon 08" format
    if (typeof d?.time === 'number') return new Date(d.time).toLocaleDateString(undefined, {weekday: 'short'});

    return weekdayShort[i % 7];
};

export default function RealizedView({data}: { data: RealizedPoint[] }) {
    const gradId = useId();
    const placeholderHeights = useMemo(() => [82, 96, 58, 36, 44, 40, 92], []);

    const bars = useMemo(() => {
        const hasData = Array.isArray(data) && data.length > 0;

        if (!hasData) {
            return weekdayShort.map((day, i) => ({
                day,
                value: placeholderHeights[i],
                barType: 'placeholder' as const,
                originalValue: null,
            }));
        }

        return data.map((point, i) => {
            let barType: 'dotted' | 'mini' | 'solid';
            let barValue: number;

            if (point.value === null) {
                // For null values, show a dotted placeholder bar
                barType = 'dotted';
                barValue = placeholderHeights[i % 7];
            } else if (point.value === 0) {
                // For zero values, show the mini bar. Give it a tiny value so recharts renders it.
                barType = 'mini';
                barValue = 1; // Use a minimal value for rendering, the shape will be overridden
            } else {
                // For positive values, show a solid bar
                barType = 'solid';
                barValue = point.value;
            }

            return {
                day: labelOf(point, i),
                value: barValue,
                barType,
                originalValue: point.value,
            };
        });
    }, [data, placeholderHeights]);

    const CustomTooltip = ({active, payload}: any) => {
        if (!active || !payload?.length) return null;
        const row = payload[0].payload;

        if (row.barType === 'dotted' || row.barType === 'placeholder') {
            return null;
        }

        const usd = Number(row.originalValue) ?? 0;

        return (
            <div
                className="bg-gray-800/60 backdrop-blur-md border border-white/20 text-white p-2.5 rounded-lg shadow-lg">
                <div className="font-medium text-xs">${usd.toLocaleString()}</div>
            </div>
        );
    };

    const BarShape = (props: any) => {
        const {x, y, width, height, payload} = props;
        const radius = 8;

        // Dotted bar for null values or when no data is provided
        if (payload.barType === 'dotted' || payload.barType === 'placeholder') {
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

        // Mini bar for zero values
        if (payload.barType === 'mini') {
            const miniBarHeight = 6;
            // Position the mini bar at the bottom of its allocated space
            const miniBarY = y + height - miniBarHeight;

            return (
                <rect
                    fill={`url(#${gradId})`}
                    height={miniBarHeight}
                    rx={miniBarHeight / 2}
                    ry={miniBarHeight / 2}
                    width={width}
                    x={x}
                    y={miniBarY}
                />
            );
        }

        // Standard solid bar for positive values
        return <rect fill={`url(#${gradId})`} height={height} rx={radius} ry={radius} width={width} x={x} y={y}/>;
    };

    return (
        <ResponsiveContainer height="100%" width="100%">
            <RBarChart barGap={8} data={bars} margin={{top: 6, right: 6, left: 6, bottom: 0}}>
                <defs>
                    <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#9EF01A" stopOpacity={0.85}/>
                        <stop offset="95%" stopColor="#4CAF50" stopOpacity={0.95}/>
                    </linearGradient>
                </defs>
                <XAxis
                    axisLine={false}
                    dataKey="day"
                    dy={8}
                    tick={{fill: '#9ca3af', fontSize: 11}}
                    tickLine={false}
                />
                <Tooltip content={<CustomTooltip/>} cursor={false}/>
                <Bar barSize={32} dataKey="value" shape={<BarShape/>}/>
            </RBarChart>
        </ResponsiveContainer>
    );
}
