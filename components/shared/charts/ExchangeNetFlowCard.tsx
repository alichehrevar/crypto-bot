'use client';

import React, {useEffect, useMemo, useState} from 'react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine
} from 'recharts';
import {addToast} from "@heroui/react";

import {getData} from "@/actions/get";
import {NetFlowsApiResponse, NetFlowsData} from "@/types/market/NetFlows";
import LoadingWithSpinner from "@/components/loading/LoadingWithSpinner";

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

// --- Type definitions for sub-component props ---
interface TooltipPayload {
    name: string;
    value: number;
    color: string;
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: TooltipPayload[];
    label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-black/80 p-3 border border-gray-700 rounded-lg text-sm shadow-lg">
                <p className="font-bold mb-1">{label}</p>
                {payload.map((entry: TooltipPayload, index: number) => (
                    <p key={index} style={{ color: entry.color, margin: 0 }}>
                        {`${entry.name}: ${entry.value.toFixed(2)}M`}
                    </p>
                ))}
            </div>
        );
    }

    return null;
};

interface GlossaryTermProps {
    term: string;
    definition: string;
}

const GlossaryTerm: React.FC<GlossaryTermProps> = ({ term, definition }) => (
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

const ExchangeNetFlowCard: React.FC = () => {
    const [netFlowData, setNetFlowData] = useState<NetFlowsData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    async function fetchNetFlows() {
        return await getData('/market/net-flows');
    }
    useEffect(() => {
        fetchNetFlows()
            .then((response: NetFlowsApiResponse) => {
                if (response.success) {
                    setNetFlowData(response.data)
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
            .finally(() => setIsLoading(false))
    }, []);

    const chartData = netFlowData?.netFlows?.history;
    const reversedHistory = useMemo(() => {
        return chartData ? [...chartData].reverse() : [];
    }, [chartData]);

    return (
        <div className="bg-dark-gray text-white rounded-lg p-6 shadow-md flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-white m-0">On-Chain Bitcoin Net Flows</h3>
                </div>
            </div>

            {/* Bar Chart */}
            <div className="w-full h-[250px]">
                {isLoading
                    ? <LoadingWithSpinner />
                    : <ResponsiveContainer height="100%" width="100%">
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
                }
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto mt-10 flex-grow">
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
                        {isLoading
                            ? <tr>
                                <td className="text-center" colSpan={5}>
                                    <LoadingWithSpinner />
                                </td>
                            </tr>
                            : <>
                                {reversedHistory.map((item, index) => (
                                    <tr key={index} className="hover:bg-white/5 transition-colors">
                                        <td className="p-3 border-b border-white/10 font-medium">{item.day}</td>
                                        <td className="p-3 border-b border-white/10">{item.txCount.toLocaleString()}</td>
                                        <td className={`p-3 border-b border-white/10 ${item.sevenDayMA && item.sevenDayMA >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {item.sevenDayMA ? `${item.sevenDayMA.toFixed(2)}M` : 'N/A'}
                                        </td>
                                        <td className={`p-3 border-b border-white/10 ${item.stablecoinFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {item.stablecoinFlow >= 0 ? '+' : ''}{item.stablecoinFlow.toFixed(2)}M
                                        </td>
                                        <td className={`p-3 border-b border-white/10 ${item.exchangeFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {item.exchangeFlow >= 0 ? '+' : ''}{item.exchangeFlow.toFixed(2)}M
                                        </td>
                                    </tr>
                                ))}
                            </>
                        }
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ExchangeNetFlowCard;
