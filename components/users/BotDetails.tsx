// components/users/BotDetails.tsx
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    ArrowLeft, PlayCircle, PauseCircle, XCircle,
    Settings, Activity, Terminal, Shield,
    Loader2, Grid3X3, Layers
} from 'lucide-react'

// --- Custom Imports ---
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { InteractiveChart } from '@/components/charts/InteractiveChart'
import { useToast } from '@/components/providers/ToastProvider'
import { getData } from "@/actions/get"
import { MOCK_PNL_DATA, MOCK_EQUITY_DATA } from '@/lib/mock-service'

// --- Types (Mirrored from BotsList to ensure consistency) ---
export type ApiBot = {
    _id: string;
    name: string;
    symbol: string;
    timeframe: string;
    leverage: string;
    botType: 'indicator' | 'grid' | 'dca';
    active: boolean;
    createdAt: string;
    strategy: string;
    marketType?: string;

    // Configs
    gridConfig?: {
        lowerPrice: number;
        upperPrice: number;
        gridCount: number;
        gridType: string;
        takeProfitPct?: number;
        stopLossPct?: number;
    };
    baseOrderVolume?: number;
    safetyOrderVolume?: number;
    maxSafetyOrders?: number;
    volumeScale?: number;
    stepScale?: number;
    priceDeviation?: number;
    takeProfitPercent?: number;
    stopLossPercent?: number;
    direction?: string;

    indicators?: { name: string; timeframe: string }[];
    tradeInfo?: {
        takeProfit?: number;
        stopLoss?: number;
        leverageLong?: number;
        leverageShort?: number;
    };

    // Stats
    pnl: {
        pct: number;
        total: number;
    };
    marketInfo?: {
        lastSignal?: string;
    };
};

// UI State
interface BotDetailState {
    id: string;
    name: string;
    status: 'active' | 'paused';
    type: 'indicator' | 'grid' | 'dca';
    pair: string;
    pnl: string;
    pnlRaw: number;
    roi: string;
    uptime: string;
    leverage: string;
    strategy: string;
    lastSignal: string;

    // Dynamic Config Details
    config: {
        mode?: string; // Trading Mode (Spot/Futures)
        takeProfit?: string;
        stopLoss?: string;
        // Grid Specific
        gridLow?: string;
        gridHigh?: string;
        gridCount?: number;
        // DCA Specific
        baseOrder?: number;
        safetyOrder?: number;
        maxSafety?: number;
        deviation?: string;
        volumeScale?: number;
        // Indicator Specific
        indicators?: string[];
    };
}

interface BotDetailsProps {
    botId: string
    userId: string
}

const calculateRuntime = (startDate: string) => {
    const start = new Date(startDate).getTime();
    const now = new Date().getTime();
    const diff = now - start;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
};

export default function BotDetailsPage({ botId, userId }: BotDetailsProps) {
    const router = useRouter()
    const { addToast } = useToast()

    const [bot, setBot] = useState<BotDetailState | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [chartType, setChartType] = useState<'PNL' | 'EQUITY'>('PNL')

    // --- Fetch Logic ---
    const fetchBotDetails = useCallback(async () => {
        setIsLoading(true);
        try {
            // Note: Adjust endpoint if your API supports direct ID fetching (e.g., /bots/${botId})
            // Here we use the list endpoint and filter, similar to BotsList logic,
            // but in a real app, a direct GET /bots/:id is better.
            const res = await getData(`/bots?userId=${userId}`);

            if (res.success) {
                const apiBot = res.bots.find((b: ApiBot) => b._id === botId);

                if (!apiBot) {
                    addToast({ title: "Error", message: "Bot not found", type: "error" });
                    router.push(`/users/${userId}`);
                    return;
                }

                // --- Mapping Logic (Identical to BotsList for consistency) ---
                const isGrid = apiBot.botType === 'grid';
                const isDca = apiBot.botType === 'dca';

                // Leverage
                let leverage = '1x';
                if (isDca && apiBot.leverage) leverage = `${apiBot.leverage}x`;
                else if (apiBot.tradeInfo?.leverageLong) leverage = `${apiBot.tradeInfo.leverageLong}x`;

                // TP / SL
                let tp = '-';
                let sl = '-';
                if (isGrid) {
                    tp = apiBot.gridConfig?.takeProfitPct ? `${apiBot.gridConfig.takeProfitPct}%` : '-';
                    sl = apiBot.gridConfig?.stopLossPct ? `${apiBot.gridConfig.stopLossPct}%` : '-';
                } else if (isDca) {
                    tp = apiBot.takeProfitPercent ? `${apiBot.takeProfitPercent}%` : '-';
                    sl = apiBot.stopLossPercent ? `${apiBot.stopLossPercent}%` : '-';
                } else {
                    tp = apiBot.tradeInfo?.takeProfit ? `${apiBot.tradeInfo.takeProfit}%` : '-';
                    sl = apiBot.tradeInfo?.stopLoss ? `${apiBot.tradeInfo.stopLoss}%` : '-';
                }

                setBot({
                    id: apiBot._id,
                    name: apiBot.name,
                    status: apiBot.active ? 'active' : 'paused',
                    type: apiBot.botType,
                    pair: apiBot.symbol,
                    pnl: apiBot.pnl.total.toFixed(2),
                    pnlRaw: apiBot.pnl.total,
                    roi: `${apiBot.pnl.pct.toFixed(2)}%`,
                    uptime: calculateRuntime(apiBot.createdAt),
                    leverage: leverage,
                    strategy: apiBot.strategy || 'Custom',
                    lastSignal: apiBot.marketInfo?.lastSignal || 'WAITING',

                    config: {
                        mode: apiBot.marketType === 'FUTURES' ? 'Futures' : 'Spot',
                        takeProfit: tp,
                        stopLoss: sl,

                        // Grid Details
                        gridLow: isGrid ? `$${apiBot.gridConfig?.lowerPrice}` : undefined,
                        gridHigh: isGrid ? `$${apiBot.gridConfig?.upperPrice}` : undefined,
                        gridCount: isGrid ? apiBot.gridConfig?.gridCount : undefined,

                        // DCA Details
                        baseOrder: isDca ? apiBot.baseOrderVolume : undefined,
                        safetyOrder: isDca ? apiBot.safetyOrderVolume : undefined,
                        maxSafety: isDca ? apiBot.maxSafetyOrders : undefined,
                        deviation: isDca ? `${apiBot.priceDeviation}%` : undefined,
                        volumeScale: isDca ? apiBot.volumeScale : undefined,

                        // Indicator Details
                        indicators: apiBot.indicators?.map((i: { name: string }) => i.name)
                    }
                });
            } else {
                addToast({ title: "Error", message: res.error || "Failed to load bot details", type: "error" });
            }
        } catch {
            addToast({ title: "Network Error", message: "Could not connect to server", type: "error" });
        } finally {
            setIsLoading(false);
        }
    }, [botId, userId, addToast, router]);

    useEffect(() => {
        fetchBotDetails();
    }, [fetchBotDetails]);

    // --- Handlers (Scaffolded) ---
    const handleAction = (action: 'PAUSE' | 'RESUME' | 'TERMINATE') => {
        // Implement API call here (e.g., postData('/bots/toggle', { id: botId }))
        addToast({
            title: "Request Sent",
            message: `Signal to ${action.toLowerCase()} bot sent to engine.`,
            type: "info"
        });
    }

    if (isLoading) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center animate-enter">
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
                <span className="text-zinc-500 font-mono text-sm uppercase tracking-widest">Retrieving Strategy Configuration...</span>
            </div>
        )
    }

    if (!bot) return null;

    return (
        <div className="animate-enter space-y-6">
            {/* Header / Nav */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => router.back()}
                    className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 uppercase tracking-widest transition-colors"
                >
                    <ArrowLeft size={14} /> Back to User
                </button>
                <div className="flex gap-2">
                    <Link href={`/users/${userId}/bot/${botId}/logs`} className="flex items-center gap-2 px-4 py-2 border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors text-xs font-bold uppercase">
                        <Terminal size={14} /> Logs
                    </Link>
                    <button className="flex items-center gap-2 px-4 py-2 border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors text-xs font-bold uppercase">
                        <Settings size={14} /> Config
                    </button>
                </div>
            </div>

            {/* Main Bot Header */}
            <Card className={`border-l-4 ${bot.status === 'active' ? 'border-l-emerald-500' : 'border-l-amber-500'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${
                            bot.type === 'grid' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' :
                                bot.type === 'dca' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                                    'bg-purple-500/10 border-purple-500/20 text-purple-500'
                        }`}>
                            {bot.type === 'grid' ? <Grid3X3 size={24} /> :
                                bot.type === 'dca' ? <Layers size={24} /> :
                                    <Activity size={24} />}
                        </div>
                        <div>
                            <h1 className="text-2xl font-light text-white uppercase tracking-wider">{bot.name}</h1>
                            <div className="flex items-center gap-3 text-xs font-mono text-zinc-500 mt-1">
                                <span>{bot.id}</span>
                                <span>•</span>
                                <span className="text-white font-bold">{bot.pair}</span>
                                <span>•</span>
                                <Badge variant={bot.status === 'active' ? 'RUNNING' : 'PAUSED'}>{bot.status.toUpperCase()}</Badge>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {bot.status === 'active' ? (
                            <button onClick={() => handleAction('PAUSE')} className="p-2 hover:bg-zinc-900 rounded text-zinc-500 hover:text-amber-500 transition-colors" title="Pause">
                                <PauseCircle size={20} />
                            </button>
                        ) : (
                            <button onClick={() => handleAction('RESUME')} className="p-2 hover:bg-zinc-900 rounded text-zinc-500 hover:text-emerald-500 transition-colors" title="Resume">
                                <PlayCircle size={20} />
                            </button>
                        )}
                        <button onClick={() => handleAction('TERMINATE')} className="p-2 hover:bg-zinc-900 rounded text-zinc-500 hover:text-rose-500 transition-colors" title="Terminate">
                            <XCircle size={20} />
                        </button>
                    </div>
                </div>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="py-4">
                    <div className="text-[10px] uppercase text-zinc-500 font-bold mb-1">Total PnL</div>
                    <div className={`text-xl font-mono ${bot.pnlRaw >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {bot.pnlRaw >= 0 ? '+' : ''}${bot.pnl}
                    </div>
                </Card>
                <Card className="py-4">
                    <div className="text-[10px] uppercase text-zinc-500 font-bold mb-1">ROI</div>
                    <div className={`text-xl font-mono ${parseFloat(bot.roi) >= 0 ? 'text-white' : 'text-rose-400'}`}>
                        {bot.roi}
                    </div>
                </Card>
                <Card className="py-4">
                    <div className="text-[10px] uppercase text-zinc-500 font-bold mb-1">Uptime</div>
                    <div className="text-xl font-mono text-zinc-300">{bot.uptime}</div>
                </Card>
                <Card className="py-4">
                    <div className="text-[10px] uppercase text-zinc-500 font-bold mb-1">Leverage</div>
                    <div className="text-xl font-mono text-amber-500">{bot.leverage}</div>
                </Card>
            </div>

            {/* Chart Section (Keeping Mock for now, would be replaced by bot.trades history if available) */}
            <div className="h-80">
                <InteractiveChart
                    data={chartType === 'PNL' ? MOCK_PNL_DATA : MOCK_EQUITY_DATA}
                    type={chartType}
                    setType={setChartType}
                />
            </div>

            {/* Config/Safety Params */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* DYNAMIC CONFIG CARD */}
                <Card>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                        <Activity size={14} /> Strategy Parameters ({bot.type.toUpperCase()})
                    </h3>
                    <div className="space-y-2 text-xs font-mono">
                        <div className="flex justify-between border-b border-zinc-900 pb-2">
                            <span className="text-zinc-500">Mode</span>
                            <span className="text-white">{bot.config.mode}</span>
                        </div>

                        {/* GRID Specifics */}
                        {bot.type === 'grid' && (
                            <>
                                <div className="flex justify-between border-b border-zinc-900 pb-2">
                                    <span className="text-zinc-500">Range</span>
                                    <span className="text-white">{bot.config.gridLow} - {bot.config.gridHigh}</span>
                                </div>
                                <div className="flex justify-between border-b border-zinc-900 pb-2">
                                    <span className="text-zinc-500">Grid Count</span>
                                    <span className="text-blue-400">{bot.config.gridCount}</span>
                                </div>
                            </>
                        )}

                        {/* DCA Specifics */}
                        {bot.type === 'dca' && (
                            <>
                                <div className="flex justify-between border-b border-zinc-900 pb-2">
                                    <span className="text-zinc-500">Base / Safety Order</span>
                                    <span className="text-white">${bot.config.baseOrder} / ${bot.config.safetyOrder}</span>
                                </div>
                                <div className="flex justify-between border-b border-zinc-900 pb-2">
                                    <span className="text-zinc-500">Max Safety Orders</span>
                                    <span className="text-amber-400">{bot.config.maxSafety}</span>
                                </div>
                                <div className="flex justify-between border-b border-zinc-900 pb-2">
                                    <span className="text-zinc-500">Deviation</span>
                                    <span className="text-white">{bot.config.deviation}</span>
                                </div>
                            </>
                        )}

                        {/* Indicator Specifics */}
                        {bot.type === 'indicator' && bot.config.indicators && (
                            <div className="flex justify-between border-b border-zinc-900 pb-2">
                                <span className="text-zinc-500">Indicators</span>
                                <div className="flex gap-1">
                                    {bot.config.indicators.map((ind, i) => (
                                        <span key={i} className="px-1.5 py-0.5 bg-zinc-900 rounded text-purple-400">{ind}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between border-b border-zinc-900 pb-2">
                            <span className="text-zinc-500">Take Profit</span>
                            <span className="text-emerald-500">{bot.config.takeProfit}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-900 pb-2">
                            <span className="text-zinc-500">Stop Loss</span>
                            <span className="text-rose-500">{bot.config.stopLoss}</span>
                        </div>
                    </div>
                </Card>

                {/* SYSTEM SAFETY CARD */}
                <Card>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                        <Shield size={14} /> System Health
                    </h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-zinc-900/50 p-2 border border-zinc-800 rounded flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span className="text-[10px] uppercase text-zinc-400">API Connection</span>
                            </div>
                            <div className="bg-zinc-900/50 p-2 border border-zinc-800 rounded flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                <span className="text-[10px] uppercase text-zinc-400">Latency: 12ms</span>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-zinc-900">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] uppercase text-zinc-500">Last Engine Signal</span>
                                <span className="text-[10px] font-mono text-white">{new Date().toLocaleTimeString()}</span>
                            </div>
                            <div className="bg-black p-3 border border-zinc-800 rounded font-mono text-xs text-emerald-400">
                                {'>'} {bot.lastSignal}
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    )
}
