"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from "next/link";
import { CheckCircle, ChevronDown, ChevronsUpDown, Clock, Pause, Play, Plus, X, Activity, Grid3X3, Layers } from 'lucide-react';
import { addToast, Spinner } from "@heroui/react";

import { getData } from "@/actions/get";

// --- TYPE DEFINITIONS ---

export type ApiBot = {
    _id: string;
    name: string;
    symbol: string;
    timeframe: string;
    leverage: string;
    accountType: string;
    paperBalance: number;
    userId: string;
    botType: 'indicator' | 'grid' | 'dca';
    active: boolean;
    mode: string; // 'live' | 'paper'
    createdAt: string;
    updatedAt: string;
    strategy: string;

    // Risk & Money Management
    riskStrategy?: string;
    marketInfo?: {
        state: string;
        baseFund?: number;
        tradeFund?: number;
        leverage?: number;
        lastSignal?: string;
        currentCandle?: { price: number };
    };

    // Trading Specifics (Indicator)
    tradeInfo?: {
        takeProfit?: number;
        stopLoss?: number;
        leverageLong?: number;
        leverageShort?: number;
        positionSide?: string;
    };

    // Grid Specifics
    gridConfig?: {
        lowerPrice: number;
        upperPrice: number;
        gridCount: number;
        gridType: string;
        takeProfitPct?: number;
        stopLossPct?: number;
    };

    // DCA Specifics (Often flat in JSON)
    baseOrderVolume?: number;
    safetyOrderVolume?: number;
    maxSafetyOrders?: number;
    volumeScale?: number;
    stepScale?: number;
    priceDeviation?: number;
    takeProfitPercent?: number;
    stopLossPercent?: number;
    direction?: string; // 'LONG' | 'SHORT'
    marketType?: string; // 'SPOT' | 'FUTURES'

    // Indicator Specifics
    indicators?: { name: string; timeframe: string }[];

    // Stats
    trades: any[] | [];
    pnl: {
        pct: number;
        realized: number;
        unrealized: number;
        total: number;
    };

    // Legacy/Unused/Common
    botTP?: number;
    botSL?: number;
    fundMode?: string;
    positionMode?: string;
    activeDeal?: boolean; // DCA specific status
};

export type DeployedBotsResponse = {
    success: boolean;
    bots: ApiBot[];
    error?: string;
};

// UI State Interface
interface Trade {
    type: 'buy' | 'sell';
    price: number;
    pnl: number;
    time: string;
}

export interface Bot {
    id: string;
    name: string;
    pair: string;
    botType: 'indicator' | 'grid' | 'dca';
    leverage: string;
    runtime: string;
    transactions: number;
    successRate: number;
    pnlPerc: number;
    pnlValue: number;
    status: 'active' | 'paused';
    strategy: string;
    initialCapital: number;
    deploymentDate: string;
    lastSignalAction: string;

    // Logic helpers
    marketType: 'Future' | 'Spot';
    tp: number | string;
    sl: number | string;
    timeframe: string;
    currentPrice: number;
    pnlRealized: number;
    pnlUnrealized: number;
    fundMode: string;
    positionMode: string;
    gridType?: string;

    // Specific Display Data
    gridDetails?: {
        rangeLow: number;
        rangeHigh: number;
        grids: number;
    };
    indicatorDetails?: {
        names: string[];
    };
    dcaDetails?: {
        baseOrder: number;
        safetyOrder: number;
        maxSteps: number;
        volScale: number;
        stepScale: number;
        deviation: number;
    };

    trades: Trade[];
    isExpanded?: boolean;

    // Stats placeholders
    avgHoldTime: string;
    winRate: number;
    sharpeRatio: number;
}

interface BotsListProps {
    refreshList?: boolean;
    title?: string;
    listType?: string;
    active?: boolean;
    showTitle?: boolean;
    showDeployButton?: boolean;
}

// --- HELPER FUNCTIONS ---

const calculateRuntime = (startDate: string) => {
    const start = new Date(startDate).getTime();
    const now = new Date().getTime();
    const diff = now - start;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h`;

    return `${hours}h`;
};

// --- HELPER COMPONENTS ---

const Tooltip = ({ content, children }: { content: string; children: React.ReactNode }) => (
    <div className="group relative flex items-center">
        {children}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-max max-w-xs scale-90 transform-gpu opacity-0 transition-all duration-200 ease-in-out group-hover:scale-100 group-hover:opacity-100 pointer-events-none z-10">
            <div className="rounded-lg border border-neutral-700/50 bg-neutral-900/95 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-md">
                {content}
            </div>
        </div>
    </div>
);

const BotStat = ({ icon: Icon, value, tooltip }: { icon: React.ElementType, value: string | number, tooltip: string }) => (
    <Tooltip content={tooltip}>
        <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span className="font-medium text-white">{value}</span>
        </div>
    </Tooltip>
);

const BotDetailItem = ({ label, value, className = "" }: { label: string, value: React.ReactNode, className?: string }) => (
    <div className={className}>
        <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-0.5">{label}</p>
        <p className="font-medium text-sm text-white truncate">{value}</p>
    </div>
);

// --- MAIN BOT CARD COMPONENT ---

const BotCard = ({ bot, onTogglePause, onDelete, onToggleExpand }: { bot: Bot, onTogglePause: () => void, onDelete: () => void, onToggleExpand: () => void }) => {
    const isPaused = bot.status === 'paused';
    const pnlPositive = bot.pnlPerc >= 0;
    const pnlColor = pnlPositive ? 'text-[#4CAF50]' : 'text-red-500';
    const pulseColor = isPaused ? 'bg-amber-500' : 'bg-lime-400';

    const nameRef = useRef<HTMLDivElement>(null);
    const [canMarquee, setCanMarquee] = useState(false);

    useEffect(() => {
        if (nameRef.current && nameRef.current.scrollWidth > nameRef.current.clientWidth) {
            setCanMarquee(true);
            nameRef.current.style.setProperty('--scroll-amount', `${nameRef.current.scrollWidth - nameRef.current.clientWidth}px`);
        } else {
            setCanMarquee(false);
        }
    }, [bot.name]);

    // Type Icon Logic
    const TypeIcon = {
        grid: Grid3X3,
        dca: Layers,
        indicator: Activity
    }[bot.botType] || Activity;

    const typeColor = {
        grid: 'text-blue-400',
        dca: 'text-amber-400',
        indicator: 'text-purple-400'
    }[bot.botType] || 'text-neutral-400';

    return (
        <div className={`
            bg-[#1A1918] border border-[#333333] rounded-xl transition-all duration-500 ease-in-out
            ${bot.isExpanded ? 'max-h-[700px]' : 'max-h-[100px]'}
        `}>
            <div className="p-4">
                {/* --- CARD HEADER --- */}
                <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 sm:gap-x-8">
                    {/* Name and Status */}
                    <div className="flex min-w-0 items-center gap-4">
                        <span className="relative flex h-3 w-3 flex-shrink-0">
                            {!isPaused && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${pulseColor}`} />}
                            <span className={`relative inline-flex rounded-full h-3 w-3 ${pulseColor}`} />
                        </span>

                        {/* Type Icon */}
                        <div className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg bg-[#262626] border border-[#333333] flex-shrink-0">
                            <TypeIcon className={`w-4 h-4 ${typeColor}`} />
                        </div>

                        <div className={`min-w-0 flex-1 overflow-hidden ${canMarquee ? 'group' : ''}`}>
                            <h4 ref={nameRef} className="truncate text-lg font-bold text-white leading-tight">
                                <span className={`inline-block ${canMarquee ? 'group-hover:animate-marquee' : ''}`}>{bot.name}</span>
                            </h4>
                            <p className="text-xs capitalize text-neutral-400 mt-0.5 flex items-center gap-2">
                                <span>{bot.botType.toUpperCase()}</span>
                                <span className="w-px h-3 bg-neutral-700" />
                                <span className="text-white font-medium">{bot.pair}</span>
                                <span className="bg-[#333] px-1.5 rounded text-[10px]">{bot.timeframe}</span>
                            </p>
                        </div>
                    </div>

                    {/* Stats (Hidden on small screens) */}
                    <div className="hidden md:flex items-center justify-center gap-x-6 me-4">
                        <BotStat icon={Clock} tooltip="Runtime" value={bot.runtime} />
                        <BotStat icon={ChevronsUpDown} tooltip="Executed trades" value={bot.transactions} />
                        {bot.transactions > 0 && (
                            <BotStat icon={CheckCircle} tooltip="Win Rate" value={`${bot.successRate}%`} />
                        )}
                    </div>

                    {/* PNL and Actions */}
                    <div className="flex items-center justify-end gap-2 sm:gap-4">
                        <Tooltip content={`Realized: $${bot.pnlRealized.toFixed(2)} | Unrealized: $${bot.pnlUnrealized.toFixed(2)}`}>
                            <div className="text-right min-w-[80px] cursor-help">
                                <p className={`text-lg font-bold ${pnlColor} leading-none mb-1`}>{pnlPositive ? '+' : ''}{bot.pnlPerc.toFixed(2)}%</p>
                                <p className="text-xs text-neutral-400">{pnlPositive ? '+' : ''}${Math.abs(bot.pnlValue).toFixed(2)}</p>
                            </div>
                        </Tooltip>

                        <div className="flex items-center gap-1.5">
                            <Tooltip content={isPaused ? 'Resume Bot' : 'Pause Bot'}>
                                <button className={`p-1.5 rounded-md transition-colors hover:opacity-80 ${isPaused ? 'bg-amber-500/10 text-amber-500' : 'bg-[#333333] text-white'}`} onClick={onTogglePause}>
                                    {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                                </button>
                            </Tooltip>
                            <Tooltip content="Close Bot">
                                <button className="p-1.5 rounded-md bg-[#333333] text-white transition-colors hover:bg-red-900/30 hover:text-red-400" onClick={onDelete}>
                                    <X className="h-4 w-4" />
                                </button>
                            </Tooltip>
                            <button
                                className={`p-1.5 rounded-md transition-all duration-300 hover:bg-white/10 ${bot.isExpanded ? 'bg-white/10' : ''}`}
                                onClick={onToggleExpand}
                            >
                                <ChevronDown className={`h-4 w-4 text-white transition-transform duration-300 ${bot.isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- EXPANDABLE DETAILS --- */}
                <div className={`
                    overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]
                    ${bot.isExpanded ? 'max-h-[500px] opacity-100 mt-4 pt-4 border-t border-[#333333]' : 'max-h-0 opacity-0'}
                `}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-sm">
                        {/* Left Column: Strategy & Config */}
                        <div className="lg:col-span-1 space-y-4">
                            <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                                <BotDetailItem label="Total Capital" value={`$${bot.initialCapital.toLocaleString()}`} />
                                <BotDetailItem label="Deployed" value={bot.deploymentDate.slice(0, 10)} />
                                <BotDetailItem label="Market" value={bot.marketType} />
                                <BotDetailItem label="Leverage" value={bot.leverage} />

                                {/* --- GRID BOTS --- */}
                                {bot.botType === 'grid' && bot.gridDetails && (
                                    <>
                                        <BotDetailItem className="col-span-2" label="Price Range" value={`$${bot.gridDetails.rangeLow} - $${bot.gridDetails.rangeHigh}`} />
                                        <BotDetailItem label="Grid Count" value={bot.gridDetails.grids} />
                                        <BotDetailItem label="Strategy" value={`Grid (${bot.gridType || 'Fixed'})`} />
                                    </>
                                )}

                                {/* --- DCA BOTS --- */}
                                {bot.botType === 'dca' && bot.dcaDetails && (
                                    <>
                                        <BotDetailItem className="col-span-2" label="Order Size (Base / Safety)" value={`$${bot.dcaDetails.baseOrder} / $${bot.dcaDetails.safetyOrder}`} />
                                        <BotDetailItem label="Max Orders" value={bot.dcaDetails.maxSteps} />
                                        <BotDetailItem label="Scaling (Vol / Step)" value={`x${bot.dcaDetails.volScale} / x${bot.dcaDetails.stepScale}`} />
                                        <BotDetailItem label="Deviation" value={`${bot.dcaDetails.deviation}%`} />
                                        <BotDetailItem label="Strategy" value={bot.strategy} />
                                    </>
                                )}

                                {/* --- INDICATOR BOTS --- */}
                                {bot.botType === 'indicator' && (
                                    <>
                                        <BotDetailItem className="col-span-2" label="Indicators" value={bot.indicatorDetails?.names.join(', ') || '-'} />
                                        <BotDetailItem label="Strategy" value={bot.strategy} />
                                    </>
                                )}

                                {/* Common TP/SL for non-DCA (or DCA if needed) */}
                                <BotDetailItem label="TP / SL" value={
                                    <>
                                        <span className="text-green-400">{bot.tp !== null && bot.tp !== '-' ? `${bot.tp}%` : '-'}</span> / <span className="text-red-400">{bot.sl !== null && bot.sl !== '-' ? `${bot.sl}%` : '-'}</span>
                                    </>
                                } />

                                <BotDetailItem className="col-span-2" label="Last Signal / Status" value={
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                        bot.lastSignalAction === 'BUY' ? 'bg-green-500/20 text-green-400' :
                                            bot.lastSignalAction === 'SELL' ? 'bg-red-500/20 text-red-400' :
                                                'bg-neutral-800 text-neutral-400'
                                    }`}>
                                        {bot.lastSignalAction}
                                    </span>
                                } />
                            </div>
                        </div>

                        {/* Right Column: Recent Trades */}
                        <div className="lg:col-span-2 border-l border-[#333333] pl-0 lg:pl-6">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs uppercase tracking-wider text-neutral-500">Recent Activity</p>
                                <span className="text-xs text-neutral-600">Last 5 trades</span>
                            </div>

                            <div className="relative overflow-hidden rounded-lg border border-[#333333] bg-[#0f0f0f]">
                                {bot.trades.length > 0 ? (
                                    <div className="max-h-40 overflow-y-auto custom-scrollbar">
                                        <table className="w-full text-xs">
                                            <thead className="sticky top-0 bg-[#1A1918] z-10 border-b border-[#333333]">
                                            <tr className="text-left text-neutral-400 font-medium">
                                                <th className="py-2 px-3">Type</th>
                                                <th className="py-2 px-3">Price</th>
                                                <th className="py-2 px-3 text-right">PNL</th>
                                                <th className="py-2 px-3 text-right">Time</th>
                                            </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#333333]">
                                            {bot.trades.map((trade, index) => (
                                                <tr key={index} className="hover:bg-[#1f1f1f] transition-colors">
                                                    <td className={`font-bold py-2 px-3 uppercase ${trade.type === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                                                        {trade.type}
                                                    </td>
                                                    <td className="py-2 px-3 text-white font-mono">${trade.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                                                    <td className={`py-2 px-3 text-right font-mono ${trade.pnl > 0 ? 'text-green-400' : trade.pnl < 0 ? 'text-red-400' : 'text-neutral-400'}`}>
                                                        {trade.pnl > 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                                                    </td>
                                                    <td className="py-2 px-3 text-right text-neutral-500">{trade.time}</td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-8 text-neutral-500 gap-2">
                                        <Clock className="w-6 h-6 opacity-20" />
                                        <span className="text-xs">No executed trades yet</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
};


// --- PARENT COMPONENT ---

export default function BotsList({
                                     refreshList = false,
                                     title = "Active Bots",
                                     listType,
                                     active = true,
                                     showTitle = true,
                                     showDeployButton = true,
                                 }: BotsListProps) {
    const [bots, setBots] = useState<Bot[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const loadBots = useCallback(async () => {
        setIsLoading(true);
        try {
            const endpoint = `/bots?active=${active}${listType ? `&botType=${listType}` : ''}`;
            const res: DeployedBotsResponse = await getData(endpoint);

            if (res.success) {
                const mappedBots = res.bots.map((apiBot: ApiBot): Bot => {
                    const isGrid = apiBot.botType === 'grid';
                    const isDca = apiBot.botType === 'dca';

                    // --- Leverage Calculation ---
                    let leverage = '1x';

                    // DCA JSON explicit check
                    if (isDca && apiBot.leverage) leverage = `${apiBot.leverage}x`;
                    else if (apiBot.tradeInfo?.leverageLong) leverage = `${apiBot.tradeInfo.leverageLong}x`;
                    else if (apiBot.tradeInfo?.leverageShort) leverage = `${apiBot.tradeInfo.leverageShort}x`;

                    // --- TP / SL Mapping ---
                    let tp: number | null = null;
                    let sl: number | null = null;

                    if (isGrid) {
                        tp = apiBot.gridConfig?.takeProfitPct || null;
                        sl = apiBot.gridConfig?.stopLossPct || null;
                    } else if (isDca) {
                        tp = apiBot.takeProfitPercent || null;
                        sl = apiBot.stopLossPercent || null;
                    } else {
                        // Indicator
                        tp = apiBot.tradeInfo?.takeProfit || apiBot.botTP || null;
                        sl = apiBot.tradeInfo?.stopLoss || apiBot.botSL || null;
                    }

                    // --- Strategy Naming ---
                    let strategyName = apiBot.strategy || 'Custom';

                    if (isGrid) strategyName = 'Grid Trading';
                    if (isDca) strategyName = `DCA ${apiBot.direction ? apiBot.direction.charAt(0) + apiBot.direction.slice(1).toLowerCase() : ''}`;

                    return {
                        id: apiBot._id,
                        name: apiBot.name || `${strategyName} Bot`,
                        pair: apiBot.symbol,
                        botType: apiBot.botType,
                        leverage: leverage,

                        // Market Data
                        timeframe: apiBot.timeframe,
                        currentPrice: apiBot.marketInfo?.currentCandle?.price || 0,
                        marketType: apiBot.marketType === 'FUTURES' ? 'Future' : 'Spot', // DCA uses explicit marketType string
                        fundMode: apiBot.fundMode ? apiBot.fundMode.charAt(0).toUpperCase() + apiBot.fundMode.slice(1) : '-',
                        positionMode: apiBot.positionMode ? apiBot.positionMode.charAt(0).toUpperCase() + apiBot.positionMode.slice(1) : '-',

                        // PNL
                        pnlPerc: apiBot.pnl.pct,
                        pnlValue: apiBot.pnl.total,
                        pnlRealized: apiBot.pnl.realized,
                        pnlUnrealized: apiBot.pnl.unrealized,

                        // Status
                        status: apiBot.active ? 'active' : 'paused',
                        transactions: apiBot.trades ? apiBot.trades.length : 0,
                        lastSignalAction: apiBot.marketInfo?.lastSignal || (apiBot.activeDeal ? "IN DEAL" : "WAITING"),

                        // Strategy & Capital
                        strategy: strategyName,
                        initialCapital: apiBot.marketInfo?.tradeFund || apiBot.paperBalance || 0, // Fallback for DCA paper mode

                        // Logic & Dates
                        deploymentDate: apiBot.createdAt,
                        runtime: calculateRuntime(apiBot.createdAt),

                        // TP/SL
                        tp: tp ?? '-',
                        sl: sl ?? '-',

                        // --- TYPE SPECIFIC DETAILS ---

                        // 1. Grid Details
                        gridDetails: isGrid && apiBot.gridConfig ? {
                            rangeLow: apiBot.gridConfig.lowerPrice,
                            rangeHigh: apiBot.gridConfig.upperPrice,
                            grids: apiBot.gridConfig.gridCount
                        } : undefined,
                        gridType: apiBot.gridConfig?.gridType,

                        // 2. DCA Details
                        dcaDetails: isDca ? {
                            baseOrder: apiBot.baseOrderVolume || 0,
                            safetyOrder: apiBot.safetyOrderVolume || 0,
                            maxSteps: apiBot.maxSafetyOrders || 0,
                            volScale: apiBot.volumeScale || 1,
                            stepScale: apiBot.stepScale || 1,
                            deviation: apiBot.priceDeviation || 0
                        } : undefined,

                        // 3. Indicator Details
                        indicatorDetails: !isGrid && !isDca && apiBot.indicators ? {
                            names: apiBot.indicators.map(i => i.name)
                        } : undefined,

                        // Trades
                        trades: apiBot.trades?.slice(0, 10).map(t => ({
                            type: t.type === 'BUY' ? 'buy' : 'sell',
                            price: t.entryPrice || t.price || 0,
                            pnl: 0,
                            time: t.timestamp ? new Date(t.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A',
                        })) || [],

                        // Placeholders
                        successRate: 0,
                        avgHoldTime: '-',
                        winRate: 0,
                        sharpeRatio: 0,
                    };
                });

                setBots(mappedBots);
            } else {
                addToast({ title: res.error || "An unknown error occurred", color: "danger" });
            }
        } catch {
            addToast({ title: "Failed to load bots", color: "danger" });
        } finally {
            setIsLoading(false);
        }
    }, [active, listType]);

    useEffect(() => {
        loadBots();
    }, [loadBots, refreshList]);

    const handleDeleteBot = (id: string) => {
        setDeletingId(id);
        setTimeout(() => {
            setBots(prev => prev.filter(bot => bot.id !== id));
            setDeletingId(null);
            addToast({ title: "Bot closed successfully", color: "success" });
        }, 500);
    };

    const handleTogglePause = (id: string) => {
        setBots(prev => prev.map(bot =>
            bot.id === id ? { ...bot, status: bot.status === 'active' ? 'paused' : 'active' } : bot
        ));
    };

    const handleToggleExpand = useCallback((id: string) => {
        setBots(prev => prev.map(bot =>
            bot.id === id ? { ...bot, isExpanded: !bot.isExpanded } : { ...bot, isExpanded: false }
        ));
    }, []);

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center h-48 rounded-lg w-full border border-dashed border-[#333333]">
                    <Spinner className="mb-3" color="primary" size="lg" />
                    <span className="text-neutral-400 animate-pulse">Syncing Bots...</span>
                </div>
            )
        }

        if (bots.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-[#333333] rounded-xl bg-[#1A1918]/50">
                    <div className="w-16 h-16 text-[#333333] mb-4">
                        <Activity className="w-full h-full opacity-20" />
                    </div>
                    <p className="mt-2 text-lg text-neutral-300 font-medium">No active bots found</p>
                    <p className="mt-1 text-sm text-neutral-500">Deploy a new strategy to track performance here.</p>
                </div>
            );
        }

        return bots.map(bot => (
            <div key={bot.id} className={`transition-all duration-500 ease-in-out ${deletingId === bot.id ? 'opacity-0 scale-95 max-h-0 overflow-hidden !m-0 !p-0' : 'opacity-100 scale-100'}`}>
                <BotCard
                    bot={bot}
                    onDelete={() => handleDeleteBot(bot.id)}
                    onToggleExpand={() => handleToggleExpand(bot.id)}
                    onTogglePause={() => handleTogglePause(bot.id)}
                />
            </div>
        ));
    }

    return (
        <div className="w-full font-sans antialiased">
            <style>{`
                @keyframes marquee {
                  0% { transform: translateX(0); }
                  20% { transform: translateX(0); }
                  100% { transform: translateX(calc(-1 * var(--scroll-amount) - 8px)); }
                }
                .animate-marquee {
                    animation: marquee 8s linear infinite alternate;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #111;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #333;
                    border-radius: 2px;
                }
            `}</style>

            <div className="flex items-center justify-between w-full mb-6 px-1">
                {showTitle && <h3 className="text-xl font-bold text-white tracking-tight">{title}</h3>}
                {showDeployButton &&
                    <Link
                        className="flex items-center gap-2 bg-white text-black py-2 px-4 rounded-lg font-bold text-sm hover:bg-neutral-200 transition-colors duration-200"
                        href="/bots"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Deploy New</span>
                    </Link>
                }
            </div>

            <div className="flex flex-col gap-4">
                {renderContent()}
            </div>
        </div>
    );
}
