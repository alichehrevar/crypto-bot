'use client';

import React, { useMemo, useRef, useEffect, useState } from 'react';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ReferenceLine,
} from 'recharts';
import {addToast} from "@heroui/react";

import {getData} from "@/actions/get";
import LoadingWithSpinner from "@/components/loading/LoadingWithSpinner";
import {SectorApiResponse, SectorDataPoint} from "@/types/market/SectorsRotation";

/* =============================================================================
   Small UI bits (info popover, tooltip, legend)
============================================================================= */

function Info({ title, content }: { title: string; content: string }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const onDoc = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };

        if (open) document.addEventListener('mousedown', onDoc);

        return () => document.removeEventListener('mousedown', onDoc);
    }, [open]);

    return (
        <div ref={ref} className="relative">
            <button
                className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-white/40 text-[10px] text-white/70 hover:text-white hover:border-white/70"
                title="About"
                type="button"
                onClick={() => setOpen((v) => !v)}
            >
                i
            </button>
            {open && (
                <div className="absolute left-0 mt-2 w-72 z-10 rounded-lg border border-white/10 bg-black/70 backdrop-blur-md p-3 shadow-xl">
                    <h4 className="text-white text-sm font-semibold mb-1">{title}</h4>
                    <p className="text-white/80 text-xs leading-relaxed">{content}</p>
                </div>
            )}
        </div>
    );
}

const GRID = 'rgba(255,255,255,0.06)';
const AXIS = '#a0a0a0';

function T({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;

    return (
        <div className="rounded-md border border-white/10 bg-black/80 backdrop-blur-md px-3 py-2 text-xs text-white shadow-lg">
            <div className="font-semibold mb-1">
                {new Date(label).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            {payload.map((p: any, i: number) => (
                <div key={i} className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ background: p.color }} />
                    <span>{p.name}</span>
                    <span className="ml-auto font-medium">{Number(p.value).toFixed(2)}</span>
                </div>
            ))}
        </div>
    );
}

function L({ payload }: any) {
    if (!payload?.length) return null;

    return (
        <div className="flex flex-wrap items-center justify-center gap-3 pb-2">
            {payload.map((p: any, idx: number) => (
                <span key={idx} className="flex items-center gap-2 text-xs text-gray-300">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                    {p.value}
        </span>
            ))}
        </div>
    );
}

/* =============================================================================
   Component
============================================================================= */

export interface MarketComparativeSectorRotationProps {
    title?: string;
    height?: number;
    className?: string;
    sectorColors?: Record<string, string>;
}

export default function MarketComparativeSectorRotation({
    title = 'Comparative Sector Rotation (30 Days Indexed)',
    height = 360,
    className,
    sectorColors,
}: MarketComparativeSectorRotationProps) {
    const [data, setData] = useState<SectorDataPoint[]>([]);
    const [loading, setLoading] = useState(true);

    async function fetchSectorsRotationData() {
        return await getData('/sectors/rotation')
    }

    // Fetch data from the backend API
    useEffect(() => {
        fetchSectorsRotationData()
            .then((response: SectorApiResponse) => {
                if (response.success) {
                    setData(response.data);
                } else {
                    addToast({
                        title: response.error,
                        color: 'warning'
                    })
                }
            })
            .catch((error) => {
                addToast({
                    title: error.message,
                    color: 'danger'
                })
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    const sectors = useMemo(() => [
        'DeFi 2.0', 'Layer 1 protocols', 'Layer 2 scaling',
        'AI & big data', 'Gaming & metaverse', 'Infrastructure',
        'Real world assets (RWA)',
    ], []);

    // Build palette (can override per-prop)
    const fallback = ['#1b4965', '#0077b6', '#00b4d8', '#48cae4', '#90e0ef', '#ade8f4', '#caf0f8'];
    const colors = (name: string, i: number) => sectorColors?.[name] ?? fallback[i % fallback.length];

    // Compute Y domain with small buffer
    const yDomain = useMemo<[number | 'auto', number | 'auto']>(() => {
        let min = Infinity, max = -Infinity;

        data.forEach((row) =>
            sectors.forEach((s) => {
                const v = Number(row[s] ?? 0);

                if (v < min) min = v;
                if (v > max) max = v;
            })
        );
        const pad = (max - min) * 0.05;

        return [Math.floor(min - pad), Math.ceil(max + pad)];
    }, [data, sectors]);

    const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    return (
        <div
            className={[
                'rounded-lg border border-white/5 bg-dark-gray p-4 shadow-[0_6px_24px_rgba(0,0,0,0.35)]',
                className || '',
            ].join(' ')}
        >
            <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white">{title}</h3>
                    <Info
                        content="Performance of multiple crypto sectors over 30 days, indexed to 100 for easy comparison. Watch for groups breaking away up or down to spot rotation and capital flows."
                        title="About Sector Rotation"
                    />
                </div>
            </div>

            {loading
                ? <LoadingWithSpinner />
                : <div style={{ height }}>
                    <ResponsiveContainer height="100%" width="100%">
                        <LineChart data={data} margin={{ top: 12, right: 18, left: 10, bottom: 6 }}>
                            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
                            <XAxis
                                axisLine={false}
                                dataKey="day"
                                height={40}
                                interval={6}
                                stroke={AXIS}
                                tick={{ fontSize: 12 }}
                                tickFormatter={fmtDate}
                                tickLine={false}
                                tickMargin={20}
                            />
                            <YAxis
                                allowDataOverflow
                                axisLine={false}
                                domain={yDomain}
                                stroke={AXIS}
                                tick={{ fontSize: 12 }}
                                tickLine={false}
                            />
                            <Tooltip content={<T />} />
                            <Legend content={<L />} verticalAlign="top" wrapperStyle={{ paddingBottom: 8 }} />
                            <ReferenceLine stroke={AXIS} strokeDasharray="2 2" y={100} />
                            {sectors.map((s, i) => (
                                <Line
                                    key={s}
                                    isAnimationActive
                                    animationDuration={1200}
                                    dataKey={s}
                                    dot={false}
                                    stroke={colors(s, i)}
                                    strokeWidth={2}
                                    type="monotone"
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            }
        </div>
    );
}
