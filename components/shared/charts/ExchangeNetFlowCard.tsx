'use client';

import React, { useMemo } from 'react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine
} from 'recharts';

// =====================================================================
// --- TYPE DEFINITIONS ---
// =====================================================================

interface NetFlowHistoryItem {
    day: string;
    inflow: number;
    outflow: number;
    totalNetFlow: number;
    stablecoinFlow: number;
    exchangeFlow: number;
    txCount: number;
    sevenDayMA: number | null;
}

interface NetFlowsData {
    netFlows: {
        history: NetFlowHistoryItem[];
    };
}

// =====================================================================
// --- CONFIGURATION ---
// =====================================================================

const CHART_GRID_COLOR = "rgba(255, 255, 255, 0.05)";
const CHART_AXIS_COLOR = "#a0a0a0";

const GLOSSARY_DEFINITIONS: Record<string, string> = {
    'Transaction count': "Total number of inflow/outflow transactions. Helps distinguish between whale activity (few, large txs) and retail activity (many, small txs).",
    '7D moving average': "The average Total Net Flow over 7 days. Smooths out daily noise to show the underlying trend of accumulation or distribution.",
    'Stablecoin net flow': "Net movement of stablecoins to/from exchanges. Positive flow can indicate buying power ('dry powder'), while negative flow suggests capital is exiting.",
    'Exchange net flow': "Net USD value of an asset moving to/from exchanges (inflow - outflow). Negative values suggest accumulation; positive values may indicate selling pressure."
};

// =====================================================================
// --- REUSABLE UI SUB-COMPONENTS ---
// =====================================================================

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-black/80 p-3 border border-gray-700 rounded-lg text-sm shadow-lg">
                <p className="font-bold mb-1">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <p key={index} style={{ color: entry.color, margin: 0 }}>
                        {`${entry.name}: ${entry.value.toFixed(2)}M`}
                    </p>
                ))}
            </div>
        );
    }

    return null;
};

const GlossaryTerm: React.FC<{ term: string; definition: string }> = ({ term, definition }) => (
    <span className="relative cursor-default border-b border-dashed border-blue-500 group">
        {term}
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-gray-800/90 backdrop-blur-md text-white text-xs font-normal normal-case leading-normal p-3 rounded-md border border-white/10 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            {definition}
        </span>
    </span>
);

// =====================================================================
// --- MAIN COMPONENT: ExchangeNetFlowCard ---
// =====================================================================

const ExchangeNetFlowCard: React.FC<{ data: NetFlowsData | null }> = ({ data }) => {
    const chartData = data?.netFlows?.history;

    const reversedHistory = useMemo(() => {
        return chartData ? [...chartData].reverse() : [];
    }, [chartData]);

    if (!chartData) {
        return (
            <div className="bg-dark-gray rounded-xl p-6 border border-white/5 shadow-md flex items-center justify-center min-h-[400px]">
                <p>Loading data...</p>
            </div>
        );
    }

    return (
        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-white/5 shadow-md flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-white m-0">Exchange & Stablecoin Net Flows</h3>
                </div>
            </div>

            {/* Bar Chart */}
            <div className="w-full h-[250px]">
                <ResponsiveContainer height="100%" width="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="3 3" />
                        <XAxis axisLine={false} dataKey="day" stroke={CHART_AXIS_COLOR} tick={{ fontSize: 12 }} tickLine={false} />
                        <YAxis axisLine={false} stroke={CHART_AXIS_COLOR} tick={{ fontSize: 12 }} tickFormatter={(val) => `${val.toFixed(0)}M`} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
                        <ReferenceLine stroke={CHART_AXIS_COLOR} y={0} />
                        <Bar dataKey="inflow" fill="#4CAF50" maxBarSize={30} name="Inflow" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="outflow" fill="#F44336" maxBarSize={30} name="Outflow" radius={[0, 0, 4, 4]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto mt-6 flex-grow">
                <table className="w-full border-collapse text-sm">
                    <thead>
                    <tr>
                        {['Date', 'Transaction count', '7D moving average', 'Stablecoin net flow', 'Exchange net flow'].map(header => (
                            <th key={header} className="p-3 border-b border-white/10 text-left font-medium text-gray-400 text-xs capitalize">
                                {GLOSSARY_DEFINITIONS[header] ? (
                                    <GlossaryTerm definition={GLOSSARY_DEFINITIONS[header]} term={header} />
                                ) : header}
                            </th>
                        ))}
                    </tr>
                    </thead>
                    <tbody>
                    {reversedHistory.map((item) => (
                        <tr key={item.day} className="hover:bg-white/5 transition-colors">
                            <td className="p-3 border-b border-white/10 font-medium">{item.day}</td>
                            <td className="p-3 border-b border-white/10">{item.txCount.toLocaleString()}</td>
                            <td className={`p-3 border-b border-white/10 ${item.sevenDayMA && item.sevenDayMA >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {item.sevenDayMA ? `${item.sevenDayMA.toFixed(2)}M` : 'N/A'}
                            </td>
                            <td className={`p-3 border-b border-white/10 ${item.stablecoinFlow >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {item.stablecoinFlow >= 0 ? '+' : ''}{item.stablecoinFlow.toFixed(2)}M
                            </td>
                            <td className={`p-3 border-b border-white/10 ${item.exchangeFlow >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {item.exchangeFlow >= 0 ? '+' : ''}{item.exchangeFlow.toFixed(2)}M
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ExchangeNetFlowCard;
