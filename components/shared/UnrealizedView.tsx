import type {UnrealizedPoint} from "@/types/profile/PnLTypes";

import React, {useMemo} from "react";
import {
    ResponsiveContainer,
    RadialBarChart as RRadialBarChart,
    RadialBar,
    PolarAngleAxis,
} from 'recharts';
import Link from "next/link";

import {ChevronRightIcon} from "@/utils/icons";

export default function UnrealizedView({ data }: { data: UnrealizedPoint[] }) {
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
                        <Link className="flex items-center gap-0.5 hover:scale-105 transition-all duration-300 bg-white text-black border-1 border-white py-1 px-2 rounded-xl font-semibold" href="/bots">
                            <span className="text-xs">Start a Bot</span>
                            <ChevronRightIcon className="size-3" strokeWidth={'2'} />
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
