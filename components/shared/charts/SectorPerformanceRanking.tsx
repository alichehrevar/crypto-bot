'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal} from "react-dom";
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell
} from 'recharts';
import {addToast} from "@heroui/react";

import {getData} from "@/actions/get";
import {SectorData, SectorsPerformanceResponse, TooltipState} from "@/types/market/SectorsPerformance";
import LoadingWithSpinner from "@/components/loading/LoadingWithSpinner";

// =====================================================================
// --- MOCK DATA & CONFIGURATION ---
// =====================================================================

const CHART_GRID_COLOR = "rgba(255, 255, 255, 0.05)";
const CHART_AXIS_COLOR = "#a0a0a0";

const glossary: Record<string, string> = {
    'DeFi 2.0': 'An evolution of Decentralized Finance, focusing on sustainable liquidity, capital efficiency, and novel mechanisms like protocol-owned liquidity.',
    'Layer 1 protocols': 'The foundational blockchains (e.g., Bitcoin, Ethereum, Solana) that process and finalize transactions on their own network.',
    'Layer 2 scaling': 'Frameworks built atop Layer 1 blockchains to enhance scalability and transaction speeds while reducing costs (e.g., Optimistic Rollups, ZK-Rollups).',
    'AI & big data': 'Projects integrating artificial intelligence and data analytics with blockchain technology for applications like decentralized AI marketplaces and predictive models.',
    'Gaming & metaverse': 'Crypto assets related to virtual worlds, play-to-earn (P2E) economies, and in-game digital ownership, often utilizing NFTs.',
    'Infrastructure': 'Fundamental protocols and services that support the broader blockchain ecosystem, including oracles, decentralized storage, and interoperability solutions.',
    'Real world assets (RWA)': 'The process of tokenizing tangible or traditional financial assets (e.g., real estate, private credit) and bringing them on-chain.',
};

// =====================================================================
// --- REUSABLE UI SUB-COMPONENTS (Unchanged) ---
// =====================================================================

const InfoButton: React.FC<{ title: string; content: string }> = ({ title, content }) => {
    const [isOpen, setIsOpen] = useState(false);
    const popupRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) document.addEventListener('mousedown', handleClickOutside);

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    return (
        <div ref={popupRef} className="relative flex items-center">
            <button
                className="flex items-center justify-center bg-transparent text-[#888] border border-[#888] rounded-full w-4 h-4 text-[10px] italic font-serif font-bold cursor-pointer transition-colors hover:border-white hover:text-white"
                onClick={() => setIsOpen(!isOpen)}
            >
                i
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 bg-black/70 backdrop-blur-md border border-white/10 rounded-lg p-4 w-72 z-10 shadow-lg animate-fadeIn">
                    <h4 className="mt-0 mb-2 text-white font-semibold">{title}</h4>
                    <p className="m-0 text-sm text-gray-300 leading-normal">{content}</p>
                </div>
            )}
        </div>
    );
};

const CardHeader: React.FC<{ title: string; infoTitle: string; infoContent: string; children?: React.ReactNode }> = ({ title, infoTitle, infoContent, children }) => (
    <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-white m-0">{title}</h3>
            <InfoButton content={infoContent} title={infoTitle} />
        </div>
        {children}
    </div>
);

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const displayLabel = payload[0]?.payload?.sector || label;
        const value = payload[0].value;
        const valueColor = value > 0 ? '#4CAF50' : '#F44336';
        const formattedValue = typeof value === 'number' ? `${value.toFixed(2)}%` : value;

        return (
            <div className="bg-black/80 p-3 border border-gray-700 rounded-lg text-sm shadow-lg">
                <p className="font-bold mb-1">{displayLabel}</p>
                <p className="m-0">
                    <span className="text-white">24h Performance: </span>
                    <span style={{ color: valueColor }}>{formattedValue}</span>
                </p>
            </div>
        );
    }

    return null;
};

const CustomYAxisTick: React.FC<any> = ({ x, y, payload, onShowTooltip, onHideTooltip }) => {
    const tickRef = useRef<HTMLDivElement>(null);
    const handlePointerEnter = () => {
        if (tickRef.current) {
            const rect = tickRef.current.getBoundingClientRect();
            const content = glossary[payload.value] || 'No definition available.';

            onShowTooltip(content, rect);
        }
    };

    return (
        <foreignObject height={30} style={{ overflow: 'visible' }} width={150} x={x - 160} y={y - 15}>
            <div
                ref={tickRef}
                className="flex items-center justify-end h-full w-full text-right text-gray-400 text-xs cursor-default"
                onPointerEnter={handlePointerEnter}
                onPointerLeave={onHideTooltip}
            >
                <span className="border-b border-dashed border-[#0088FE] pb-px">{payload.value}</span>
            </div>
        </foreignObject>
    );
};


// =====================================================================
// --- MAIN SECTOR PERFORMANCE CHART COMPONENT ---
// =====================================================================

const SectorPerformanceRanking: React.FC = () => {
    // --- STATE MANAGEMENT for API data, loading, and errors ---
    const [chartData, setChartData] = useState<SectorData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
    const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, content: '', anchorRect: null });
    const tooltipRef = useRef<HTMLDivElement>(null);
    const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // --- DATA FETCHING ---
    async function fetchPerformanceData () {
        return await getData('/sectors/performance')
    }
    useEffect(() => {
        setIsLoading(true);
        fetchPerformanceData()
            .then((response: SectorsPerformanceResponse) => {
                if (response.success) {
                    setChartData(response.data);
                } else {
                    addToast({
                        title: response.error,
                        color: 'warning'
                    })
                }
            })
            .catch(() => {
                addToast({
                    title: 'Could not load chart data. Please try again later.',
                    color: 'danger'
                })
            })
            .finally(() =>  setIsLoading(false))

    }, []);

    useEffect(() => {
        // This code only runs on the client-side after the initial render
        const portal = document.getElementById('tooltip-portal-root');

        setPortalContainer(portal);
    }, []);

    const showTooltip = (content: string, rect: DOMRect) => {
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        setTooltip({ visible: true, content, anchorRect: rect });
    };

    const hideTooltip = () => {
        hideTimeoutRef.current = setTimeout(() => {
            setTooltip(t => ({ ...t, visible: false }));
        }, 100);
    };

    // --- RENDER LOGIC for Chart based on state ---
    const ChartComponent = () => {
        if (isLoading) {
            return <div className="h-[300px] flex items-center justify-center">
                <LoadingWithSpinner />
            </div>;
        }

        if (!chartData || !chartData.performance || chartData.performance.length === 0) {
            return <div className="text-center text-gray-500 p-10 min-h-[300px] flex items-center justify-center">No performance data available.</div>;
        }

        const TickWithTooltipHandlers = (props: any) => (
            <CustomYAxisTick {...props} onHideTooltip={hideTooltip} onShowTooltip={showTooltip} />
        );

        return (
            <div className="mt-6 flex-grow h-[300px]">
                <ResponsiveContainer height={300} width="100%">
                    <BarChart barCategoryGap="20%" data={chartData.performance} layout="vertical" margin={{ top: 20, left: 30, right: 20, bottom: 20 }}>
                        <CartesianGrid horizontal={false} stroke={CHART_GRID_COLOR} strokeDasharray="3 3" />
                        <XAxis axisLine={false} stroke={CHART_AXIS_COLOR} tick={{ fontSize: 12 }} tickLine={false} tickMargin={10} type="number" unit="%" />
                        <YAxis axisLine={false} dataKey="sector" tick={<TickWithTooltipHandlers />} tickLine={false} type="category" width={160} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
                        <ReferenceLine stroke={CHART_AXIS_COLOR} strokeDasharray="2 2" x={0} />
                        <Bar dataKey="performance1D" name="24h Performance" radius={[0, 5, 5, 0]}>
                            {chartData.performance.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.performance1D > 0 ? '#4CAF50' : '#F44336'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    }

    // GlossaryTooltip remains separate for portal rendering logic
    const GlossaryTooltip = () => {
        if (!tooltip.visible || !tooltip.anchorRect) return null;

        const style: React.CSSProperties = {
            position: 'fixed',
            top: tooltip.anchorRect.top,
            left: tooltip.anchorRect.right + 10,
            transition: 'opacity 0.2s ease',
            opacity: tooltip.visible ? 1 : 0,
            pointerEvents: 'none',
        };

        return (
            <div ref={tooltipRef} className="w-64 bg-gray-900/70 backdrop-blur-xl border border-white/20 rounded-lg p-3 text-white text-xs leading-normal shadow-2xl z-[9999]" style={style}>
                {tooltip.content}
            </div>
        );
    };

    return (
        <div className="p-6 ua-card shadow-md flex flex-col">
            <CardHeader
                infoContent="This chart ranks market sectors by their collective performance over the last 24 hours. It helps identify which narratives or categories (like AI, Gaming, or DeFi) are currently attracting capital and showing strength."
                infoTitle="About Sector Performance"
                title="Sector Performance Ranking (24h)"
            />
            <ChartComponent />
            {/* Note: For the tooltip portal to work, ensure you have <div id="tooltip-portal-root"></div> in your main layout.tsx */}
            {portalContainer && createPortal(<GlossaryTooltip />, portalContainer)}
        </div>
    );
};


export default SectorPerformanceRanking;
