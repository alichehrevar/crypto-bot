'use client';

import React, { useState, useMemo } from 'react';
import {
    ResponsiveContainer, LineChart, Line, ScatterChart, Scatter, ZAxis, ReferenceLine, Cell, Tooltip, XAxis, YAxis, CartesianGrid
} from 'recharts';

// =====================================================================
// --- TYPE DEFINITIONS ---
// =====================================================================

interface MoverItem {
    asset: string;
    change: number;
    volume: number;
    rVol: number;
    sparkline: number[];
}

export interface MoversData {
    gainers: MoverItem[];
    losers: MoverItem[];
    volatilityScatter: MoverItem[];
}

// =====================================================================
// --- REUSABLE SUB-COMPONENTS ---
// =====================================================================

const GlossaryTerm: React.FC<{ term: string }> = ({ term }) => (
    <span className="relative cursor-default border-b border-dashed border-blue-500 group">
        {term}
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-gray-800/90 backdrop-blur-md text-white text-xs font-normal normal-case leading-normal p-3 rounded-md border border-white/10 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            Relative volume compares current trading volume to the average volume over a specific period, highlighting unusual activity.
        </span>
    </span>
);

const CustomChartTooltip: React.FC<any> = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;

        return (
            <div className="bg-black/80 p-3 border border-gray-700 rounded-lg text-sm shadow-lg">
                <p className="font-bold mb-1">{data.asset}</p>
                <p className="m-0"><span className="text-white">Price Change: </span><span className={data.change >= 0 ? 'text-green-500' : 'text-red-500'}>{data.change.toFixed(2)}%</span></p>
                <p className="m-0"><span className="text-white">Volume: </span><span className="text-blue-400">${(data.volume / 1000000).toFixed(1)}M</span></p>
                <p className="m-0"><span className="text-white">Relative Volume: </span><span className="text-blue-400">{data.rVol.toFixed(2)}x</span></p>
            </div>
        );
    }

    return null;
};

// =====================================================================
// --- MAIN COMPONENT ---
// =====================================================================

const MoversAndVolatility: React.FC<{ data: MoversData | null }> = ({ data }) => {
    const [moverView, setMoverView] = useState<'gainers' | 'losers'>('gainers');
    const [activeSubTab, setActiveSubTab] = useState<'table' | 'chart'>('table');

    const items = useMemo(() => {
        if (!data) return [];

        return moverView === 'gainers' ? data.gainers : data.losers;
    }, [moverView, data]);

    if (!data) {
        return <div className="bg-dark-gray rounded-xl p-6 border border-white/5 shadow-md min-h-[400px] flex items-center justify-center">Loading...</div>;
    }

    return (
        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-white/5 shadow-md flex flex-col h-full">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                <h3 className="text-lg font-semibold text-white m-0">Market Movers & Volatility</h3>
                <div className="flex items-center gap-4">
                    {/* Mover Type Toggles (Gainers/Losers) */}
                    <div className={`flex gap-2 ${activeSubTab !== 'table' ? 'invisible' : ''}`}>
                        <button className={`p-1.5 rounded-md ${moverView === 'gainers' ? 'text-white' : 'text-gray-500 hover:text-white'}`} onClick={() => setMoverView('gainers')}>
                            <svg fill="none" height="20" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="20"><path d="M18 8l-4-4-4 4M18 16V4M3 8h11M3 12h11M3 16h8" /></svg>
                        </button>
                        <button className={`p-1.5 rounded-md ${moverView === 'losers' ? 'text-white' : 'text-gray-500 hover:text-white'}`} onClick={() => setMoverView('losers')}>
                            <svg fill="none" height="20" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="20"><path d="M18 16l-4 4-4-4M18 8v12M3 8h11M3 12h11M3 16h8" /></svg>
                        </button>
                    </div>
                    {/* View Toggles (Table/Chart) */}
                    <div className="flex overflow-hidden text-sm">
                        <button className={`px-3 py-1.5 ${activeSubTab === 'table' ? 'border-b-1 text-white' : 'text-gray-400'}`} onClick={() => setActiveSubTab('table')}>Table</button>
                        <button className={`px-3 py-1.5 ${activeSubTab === 'chart' ? 'border-b-1 text-white' : 'text-gray-400'}`} onClick={() => setActiveSubTab('chart')}>Chart</button>
                    </div>
                </div>
            </div>

            {activeSubTab === 'table' && (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm text-center">
                        <thead><tr>{['Asset', '24h Change', 'Volume (USD)', 'RVOL', 'Trend'].map(h => <th key={h} className={`p-3 border-b border-white/10 font-medium text-gray-400 text-xs ${h === 'Asset' ? 'text-left' : ''}`}>{h === 'RVOL' ? <GlossaryTerm term={h} /> : h}</th>)}</tr></thead>
                        <tbody>
                        {items.map((item) => (
                            <tr key={item.asset} className="hover:bg-white/5">
                                <td className="p-3 border-b border-white/10 text-left font-semibold text-white">{item.asset}</td>
                                <td className={`p-3 border-b border-white/10 font-medium ${item.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>{item.change.toFixed(2)}%</td>
                                <td className="p-3 border-b border-white/10">${(item.volume / 1000000).toFixed(2)}M</td>
                                <td className={`p-3 border-b border-white/10 font-medium ${item.rVol > 2.5 ? 'text-yellow-400' : ''}`}>{item.rVol.toFixed(2)}x</td>
                                <td className="p-3 border-b border-white/10 h-[40px]">
                                    <ResponsiveContainer height={30} width="100%"><LineChart data={item.sparkline.map(v => ({ pv: v }))}><Line dataKey="pv" dot={false} stroke={item.change >= 0 ? "#4CAF50" : "#F44336"} strokeWidth={2} type="monotone" /></LineChart></ResponsiveContainer>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeSubTab === 'chart' && (
                <div className="w-full h-[500px] mt-4">
                    <ResponsiveContainer height="100%" width="100%">
                        <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                            <CartesianGrid stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3 3" />
                            <XAxis dataKey="change" name="Price Change" stroke="#a0a0a0" tick={{ fontSize: 12 }} type="number" unit="%" />
                            <YAxis dataKey="volume" name="Volume" stroke="#a0a0a0" tick={{ fontSize: 12 }} tickFormatter={v => `${(v/1000000).toFixed(0)}M`} type="number" />
                            <ZAxis dataKey="rVol" name="Relative Volume" range={[50, 600]} type="number" />
                            <Tooltip content={<CustomChartTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                            <ReferenceLine stroke="#a0a0a0" strokeDasharray="2 2" x={0} />
                            <Scatter data={data.volatilityScatter} name="Assets">
                                {data.volatilityScatter.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.change > 0 ? '#4CAF50' : '#F44336'} fillOpacity={Math.min(1, entry.rVol / 5 + 0.3)} />))}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};

export default MoversAndVolatility;
