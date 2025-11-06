"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from "next/link";
import { CheckCircle, ChevronDown, ChevronsUpDown, Clock, Pause, Play, Plus, X } from 'lucide-react';
// --- Helper imports from your project ---
import { addToast, Spinner } from "@heroui/react";

import { getData } from "@/actions/get";

// --- TYPE DEFINITIONS ---

// The Bot type definition from your API response
export type ApiBot = {
    _id: string;
    name: string;
    active: boolean;
    botTP: number;
    botSL: number;
    cumulativePnL: number;
    createdAt: string;
    updatedAt: string;
    mode: string;
    userId: string;
    userLevel: number;
    symbol: string;
    timeframe: string;
    indicators: any[];
    marketInfo: {
        leverage?: number;
        tradeFund?: number;
        lastSignal?: string;
    };
    tradeInfo: any;
    gridConfig: {
        takeProfitPct?: number;
        stopLossPct?: number;
    };
    trades: any[] | [];
    paperBalance: number;
    pnl: {
        pct: number;
        realized: number;
        unrealized: number;
        total: number;
    };
    accountType: string;
    botType: string;
    strategy: string;
    riskStrategy: string;
    share: boolean;
    __v: number;
};

export type DeployedBotsResponse = {
    success: boolean;
    bots: ApiBot[];
    error?: string;
};


// The Bot type expected by the UI components
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
    leverage: string;
    runtime: string;
    transactions: number;
    successRate: number;
    pnlPerc: number;
    pnlValue: number;
    status: 'active' | 'paused';
    strategy: string;
    initialCapital: number;
    avgHoldTime: string;
    deploymentDate: string;
    winRate: number;
    sharpeRatio: number;
    lastSignalAction: string;
    marketType: 'Future' | 'Spot';
    marginType: 'Cross' | 'Isolated' | null;
    positionMode: 'Hedge' | 'Single' | null;
    tp: number | null;
    sl: number | null;
    trades: Trade[];
    isExpanded?: boolean;
}

// --- Component Prop Types ---
interface BotsListProps {
    refreshList?: boolean;
    title?: string;
    listType?: string;
    active?: boolean;
    showTitle?: boolean;
    showDeployButton?: boolean;
}


// --- HELPER COMPONENTS (Unchanged) ---

const Tooltip = ({ content, children }: { content: string; children: React.ReactNode }) => (
    <div className="group relative flex items-center">
        {children}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-max max-w-xs scale-90 transform-gpu opacity-0 transition-all duration-200 ease-in-out group-hover:scale-100 group-hover:opacity-100 pointer-events-none">
            <div className="rounded-lg border border-neutral-700/50 bg-neutral-900/80 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-md">
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

const BotDetailItem = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div>
        <p className="text-xs text-neutral-400">{label}</p>
        <p className="font-medium text-white">{value}</p>
    </div>
);


// --- MAIN BOT CARD COMPONENT (Unchanged) ---

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
            const scrollAmount = nameRef.current.scrollWidth - nameRef.current.clientWidth;

            nameRef.current.style.setProperty('--scroll-amount', `${scrollAmount}px`);
        } else {
            setCanMarquee(false);
        }
    }, [bot.name]);


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
                        <div className={`min-w-0 flex-1 overflow-hidden ${canMarquee ? 'group' : ''}`}>
                            <h4 ref={nameRef} className="truncate text-lg font-bold text-white">
                                <span className={`inline-block ${canMarquee ? 'group-hover:animate-marquee' : ''}`}>{bot.name}</span>
                            </h4>
                            <p className="text-xs capitalize text-neutral-400">{bot.status} | {bot.pair}</p>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="hidden sm:flex items-center justify-center gap-x-6 me-8">
                        <BotStat icon={Clock} tooltip="Operation time" value={bot.runtime} />
                        <BotStat icon={ChevronsUpDown} tooltip="Executed trades" value={bot.transactions} />
                        <BotStat icon={CheckCircle} tooltip="Profitable trades" value={`${bot.successRate}%`} />
                    </div>

                    {/* PNL and Actions */}
                    <div className="flex items-center justify-end gap-2 sm:gap-4">
                        <div className="text-right">
                            <p className={`text-lg font-bold ${pnlColor}`}>{pnlPositive ? '+' : ''}{bot.pnlPerc.toFixed(2)}%</p>
                            <p className="text-xs text-neutral-400">{pnlPositive ? '+' : '-'}${Math.abs(bot.pnlValue).toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Tooltip content={isPaused ? 'Resume Bot' : 'Pause Bot'}>
                                <button className={`p-2 rounded-md transition-colors hover:opacity-80 ${isPaused ? 'bg-amber-500' : 'bg-[#333333]'}`} onClick={onTogglePause}>
                                    {isPaused ? <Play className="h-4 w-4 text-white" /> : <Pause className="h-4 w-4 text-white" />}
                                </button>
                            </Tooltip>
                            <Tooltip content="Close Bot">
                                <button className="p-2 rounded-md bg-[#333333] transition-colors hover:bg-red-800/50" onClick={onDelete}>
                                    <X className="h-4 w-4 text-white" />
                                </button>
                            </Tooltip>
                            <Tooltip content="View Metrics">
                                <button className="p-2 rounded-md bg-transparent transition-transform duration-300 hover:bg-white/10" style={{ transform: bot.isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }} onClick={onToggleExpand}>
                                    <ChevronDown className="h-4 w-4 text-white" />
                                </button>
                            </Tooltip>
                        </div>
                    </div>
                </div>

                {/* --- EXPANDABLE DETAILS --- */}
                <div className={`
                    overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]
                    ${bot.isExpanded ? 'max-h-[500px] opacity-100 mt-4 pt-4 border-t border-[#333333]' : 'max-h-0 opacity-0'}
                `}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 text-sm">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <BotDetailItem label="Strategy" value={bot.strategy} />
                                <BotDetailItem label="Initial Capital" value={`$${bot.initialCapital.toLocaleString()}`} />
                                <BotDetailItem label="Deployment" value={bot.deploymentDate.replace(/-/g, '.').slice(0, 16)} />
                                <BotDetailItem label="Avg. Hold Time" value={bot.avgHoldTime} />
                                <BotDetailItem label="Win Ratio" value={`${bot.winRate}%`} />
                                <BotDetailItem label="Sharpe Ratio" value={bot.sharpeRatio} />
                                <BotDetailItem label="Type" value={bot.marketType} />
                                <BotDetailItem label="Leverage" value={bot.marketType === 'Future' ? bot.leverage : '-'} />
                                <BotDetailItem label="TP/SL" value={<>
                                    <span className="font-medium text-green-400">{bot.tp ? `${bot.tp}%` : '-'}</span> / <span className="font-medium text-red-400">{bot.sl ? `${bot.sl}%` : '-'}</span>
                                </>} />
                                <BotDetailItem label="Margin" value={bot.marginType || '-'} />
                                <BotDetailItem label="Position" value={bot.positionMode || '-'} />
                                <BotDetailItem label="Last Action" value={bot.lastSignalAction} />
                            </div>
                        </div>
                        <div className="lg:col-span-2">
                            <p className="mb-2 text-xs text-neutral-400">Recent Trades</p>
                            <div className="max-h-40 overflow-y-auto pr-2">
                                {bot.trades.length > 0 ? (
                                    <table className="w-full text-xs">
                                        <thead>
                                        <tr className="text-left text-neutral-400 font-medium">
                                            <th className="py-1 px-2">Type</th>
                                            <th className="py-1 px-2">Price</th>
                                            <th className="py-1 px-2">PNL ($)</th>
                                            <th className="py-1 px-2">Time</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {bot.trades.map((trade, index) => (
                                            <tr key={index}>
                                                <td className={`capitalize font-medium py-1 px-2 ${trade.type === 'buy' ? 'text-green-400' : 'text-red-400'}`}>{trade.type}</td>
                                                <td className="py-1 px-2 text-white">${trade.price.toFixed(2)}</td>
                                                <td className={`py-1 px-2 ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>{trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}</td>
                                                <td className="py-1 px-2 text-white">{trade.time}</td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="py-8 text-center text-sm text-neutral-500">No trades recorded yet.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
};


// --- PARENT COMPONENT (Renamed, Props Added) ---

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
            // Use props in the API call
            const endpoint = `/bots?active=${active}${listType ? `&botType=${listType}` : ''}`;
            const res: DeployedBotsResponse = await getData(endpoint);

            if (res.success) {
                const mappedBots = res.bots.map((apiBot: ApiBot): Bot => ({
                    id: apiBot._id,
                    name: apiBot.name || `${apiBot.strategy} Bot`,
                    pair: apiBot.symbol,
                    leverage: apiBot.marketInfo?.leverage ? `${apiBot.marketInfo.leverage}x` : 'N/A',
                    pnlPerc: apiBot.pnl.pct,
                    pnlValue: apiBot.pnl.total,
                    status: apiBot.active ? 'active' : 'paused',
                    transactions: apiBot.trades ? apiBot.trades.length : 0,
                    strategy: apiBot.strategy,
                    initialCapital: apiBot.marketInfo?.tradeFund || 0,
                    lastSignalAction: apiBot.marketInfo?.lastSignal ?? "—",
                    marketType: apiBot.accountType === 'futures' ? 'Future' : 'Spot',
                    tp: apiBot.botTP || null,
                    sl: apiBot.botSL || null,
                    deploymentDate: apiBot.createdAt,
                    runtime: 'N/A',
                    successRate: 0,
                    avgHoldTime: 'N/A',
                    winRate: 0,
                    sharpeRatio: 0,
                    marginType: null,
                    positionMode: null,
                    trades: apiBot.trades?.slice(0, 5).map(t => ({
                        type: t.side === 'buy' ? 'buy' : 'sell',
                        price: t.price || 0,
                        pnl: t.realizedPnl || 0,
                        time: t.time ? new Date(t.time).toLocaleTimeString() : 'N/A',
                    })) || [],
                }));

                setBots(mappedBots);
            } else {
                addToast({ title: res.error || "An unknown error occurred", color: "danger" });
            }
        } catch (err: any) {
            addToast({ title: err.message || "Failed to load bots", color: "danger" });
        } finally {
            setIsLoading(false);
        }
    }, [active, listType]); // Dependency array for useCallback

    useEffect(() => {
        loadBots();
    }, [loadBots, refreshList]); // Re-fetch when refreshList changes

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
                <div className="flex items-center justify-center flex-row-reverse gap-3 h-24 rounded-lg w-full">
                    <Spinner className="mr-2" color="primary" size="sm" variant="wave" />
                    Loading Bots…
                </div>
            )
        }

        if (bots.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-[#333333] rounded-lg">
                    <div className="w-16 h-16 text-[#333333] mb-4">
                        <svg fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                    <p className="mt-4 text-lg text-neutral-400">No active bots</p>
                    <p className="mt-1 text-sm text-neutral-500">Click &#39;Deploy New&#39; to get started.</p>
                </div>
            );
        }

        return bots.map(bot => (
            <div key={bot.id} className={`transition-all duration-500 ease-in-out ${deletingId === bot.id ? 'opacity-0 scale-95 max-h-0 !m-0 !p-0 !border-0' : 'opacity-100 scale-100'}`}>
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
        <div className="ua-card text-white font-sans antialiased w-full">
            <style>{`
                @keyframes marquee {
                  0% { transform: translateX(0); }
                  15% { transform: translateX(0); }
                  85% { transform: translateX(calc(-1 * var(--scroll-amount) - 4px)); }
                  100% { transform: translateX(calc(-1 * var(--scroll-amount) - 4px)); }
                }
                .animate-marquee {
                    animation: marquee 5s linear 1 forwards;
                }
            `}</style>
            <div className="w-full">
                <div className="p-6 h-full">
                    <div className="flex items-center justify-between w-full mb-6">
                        {showTitle && <h3 className="text-lg font-bold text-white">{title}</h3>}
                        {showDeployButton &&
                            <Link
                                className="flex items-center gap-2 bg-white text-black py-2 px-4 rounded-lg font-medium text-sm cursor-pointer hover:opacity-90 transition-opacity duration-300 disabled:opacity-50"
                                href="/bots"
                            >
                                <span>Deploy New</span>
                                <Plus className="w-4 h-4" />
                            </Link>
                        }
                    </div>

                    <div className="flex flex-col gap-4">
                        {renderContent()}
                    </div>
                </div>
            </div>
        </div>
    );
}
