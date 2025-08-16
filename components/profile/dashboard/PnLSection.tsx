'use client';

import type {
    RealizedPnLResponse,
    RealizedPoint,
    UnrealizedPnLResponse,
    UnrealizedPoint,
} from '@/types/profile/PnLTypes';

import React, { useEffect, useMemo, useState, useId } from 'react';
import { Tabs, Tab, addToast } from '@heroui/react';
import {
    ResponsiveContainer,
    BarChart as RBarChart,
    Bar,
    XAxis,
    Tooltip,
    RadialBarChart as RRadialBarChart,
    RadialBar,
    PolarAngleAxis,
} from 'recharts';
import Link from "next/link";

import { getData } from '@/actions/get';
import {ChevronRightIcon} from "@/utils/icons";

/* ---------------- helpers: normalize backend shapes ---------------- */

const weekdayShort = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const labelOf = (d: any, i: number) => {
    if (d?.day) return d.day;
    if (d?.label) return d.label;
    if (d?.date) return new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' });
    if (typeof d?.time === 'number') return new Date(d.time).toLocaleDateString(undefined, { weekday: 'short' });

    return weekdayShort[i % 7];
};

const valueOf = (d: any) => Number(d?.value ?? d?.pnl ?? d?.amount ?? 0);

/* ---------------- realized view (bar) with no-data skeleton ---------------- */

function RealizedView({ data }: { data: RealizedPoint[] }) {
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
                <Bar barSize={22} dataKey="value" shape={<BarShape />} />
            </RBarChart>
        </ResponsiveContainer>
    );
}

/* ---------------- unrealized view (radial rings) ---------------- */

function UnrealizedView({ data }: { data: UnrealizedPoint[] }) {
    const positions = useMemo(() => (Array.isArray(data) ? data.slice(0, 4) : []), [data]);
    const base = [{ name: 'P1' }, { name: 'P2' }, { name: 'P3' }, { name: 'P4' }];

    const chartData = base
        .map((slot, i) => {
            const p = positions[i];
            const id = p ? String((p as any).id ?? (p as any).symbol ?? slot.name) : slot.name;
            const pnl = p ? Math.min(Math.abs(Number((p as any).pnl ?? (p as any).pnlPercent ?? 0)), 100) : 0;
            const fill = p ? String((p as any).color ?? (Number((p as any).pnl ?? 0) >= 0 ? '#57D971' : '#ef4444')) : 'transparent';

            return { name: id, value: pnl, fill };
        })
        .reverse();

    const hasAny = positions.length > 0;

    return (
        <div className="flex w-full h-full items-center">
            <div className="w-2/3 h-full">
                <ResponsiveContainer height="100%" width="100%">
                    <RRadialBarChart
                        barSize={8}
                        cx="50%"
                        cy="50%"
                        data={chartData}
                        endAngle={-270}
                        innerRadius="46%"
                        outerRadius="108%"
                        startAngle={90}
                    >
                        <PolarAngleAxis domain={[0, 100]} tick={false} type="number" />
                        <RadialBar background={{ fill: '#2C2C2E' }} cornerRadius={4} dataKey="value" />
                    </RRadialBarChart>
                </ResponsiveContainer>
            </div>

            <div className="w-1/3 flex flex-col justify-center items-center pl-3">
                {hasAny ? (
                    <div className="w-full flex flex-col justify-center space-y-2">
                        {positions.map((p: any, i) => {
                            const color = String(p?.color ?? (Number(p?.pnl ?? 0) >= 0 ? '#46e746' : '#DF3562FF'));
                            const pnl = Number(p?.pnl ?? p?.pnlPercent ?? 0);
                            const name = String(p?.id ?? p?.symbol ?? `Position ${i + 1}`);

                            return (
                                <div key={name} className="flex items-center text-xs">
                                    <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: color }} />
                                    <span className="text-gray-300 flex-grow">{name}</span>
                                    <span className={`font-semibold ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {pnl >= 0 ? '+' : ''}
                                        {pnl}%
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col justify-center items-center space-y-3">
                        <p className="text-gray-400 text-xs font-semibold text-nowrap">No Open Positions</p>
                        <Link className="flex items-center gap-0.5 hover:scale-105 transition-all duration-300 bg-white text-black border-1 border-white py-1 px-2 rounded-xl font-semibold" href="/profile/bots">
                            <span className="text-xs">Start a Bot</span>
                            <ChevronRightIcon className="size-3" strokeWidth={'2'} />
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ---------------- main component ---------------- */

export default function PnLSection() {
    const [tab, setTab] = useState<'realized-pnl' | 'unrealized-pnl'>('realized-pnl');
    const [realizedData, setRealizedData] = useState<RealizedPoint[]>([]);
    const [unrealizedData, setUnrealizedData] = useState<UnrealizedPoint[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let abort = false;

        (async () => {
            setLoading(true);
            const period = '1D';

            try {
                if (tab === 'realized-pnl') {
                    const res: RealizedPnLResponse = await getData(`/pnl/realized?period=${period}`);

                    if (!abort) {
                        if (!res?.success) {
                            addToast({ title: 'Error loading PnL data!', color: 'danger' });

                            return;
                        }
                        setRealizedData(res.data || []);
                    }
                } else {
                    const res: UnrealizedPnLResponse = await getData(`/pnl/unrealized?period=${period}`);

                    if (!abort) {
                        if (!res?.success) {
                            addToast({ title: 'Error loading PnL data!', color: 'danger' });

                            return;
                        }
                        setUnrealizedData(res.data || []);
                    }
                }
            } catch (err: any) {
                if (!abort) addToast({ title: err?.message || 'Error loading PnL data', color: 'danger' });
            } finally {
                if (!abort) setLoading(false);
            }
        })();

        return () => {
            abort = true;
        };
    }, [tab]);

    return (
        <div className="space-y-4 w-full">
            <div className="flex items-center justify-between w-full">
                <h4 className="font-bold text-[16px]">PnL</h4>

                <Tabs
                    aria-label="PnL Type"
                    classNames={{
                        tabList: 'h-7 rounded-full px-0.5 ml-3 mt-1',
                        tab: 'pt-0 pb-2 px-2 h-6 text-[12px]',
                        cursor: 'rounded-full',
                    }}
                    selectedKey={tab}
                    variant="underlined"
                    onSelectionChange={(k) => setTab(k as any)}
                >
                    <Tab key="realized-pnl" title="Realized" />
                    <Tab key="unrealized-pnl" title="Unrealized" />
                </Tabs>
            </div>

            <div
                className={`
          w-full h-[150px] transition-all duration-200
          ${tab === 'unrealized-pnl' ? 'ml-[-35px] overflow-x-hidden' : ''}
        `}
            >
                {loading ? (
                    <div className="flex items-center justify-center h-full text-gray-500">Loading…</div>
                ) : tab === 'realized-pnl' ? (
                    <RealizedView data={realizedData} />
                ) : (
                    <UnrealizedView data={unrealizedData} />
                )}
            </div>
        </div>
    );
}
