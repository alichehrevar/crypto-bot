'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { Search, ChevronRight, ArrowUpDown, Loader2 } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { Pagination } from '@/components/common/Pagination'
import { PremiumCheckbox } from '@/components/common/PremiumCheckbox'
import { useToast } from '@/components/providers/ToastProvider'
import { getData } from "@/actions/get"

interface BotsTabProps {
    userId: string;
}

type ApiBot = {
    _id: string;
    name: string;
    symbol: string;
    botType: 'indicator' | 'grid' | 'dca';
    active: boolean;
    createdAt: string;
    leverage?: string;
    marketType?: string;
    tradeInfo?: { leverageLong?: number; leverageShort?: number };
    pnl: { pct: number; total: number };
};

type DeployedBotsResponse = {
    success: boolean;
    bots: ApiBot[];
    error?: string;
};

interface UiBot {
    id: string;
    name: string;
    status: string;
    type: string;
    tradingMode: string;
    symbol: string;
    startedAt: string;
    pnl: string;
    rawPnl: number;
}

export const BotsTab = ({ userId }: BotsTabProps) => {
    const { addToast } = useToast()
    const [bots, setBots] = useState<UiBot[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // Filters State
    const [botSearch, setBotSearch] = useState('')
    const [botPage, setBotPage] = useState(1)
    const [botStatusFilters, setBotStatusFilters] = useState({ RUNNING: true, PAUSED: true, STOPPED: true, ERROR: true })
    const [botSort, setBotSort] = useState('DEFAULT')

    const fetchUserBots = useCallback(async () => {
        setIsLoading(true);
        try {
            const res: DeployedBotsResponse = await getData(`/bots?userId=${userId}`);
            if (res.success) {
                const mappedBots: UiBot[] = res.bots.map((apiBot) => {
                    const startDate = new Date(apiBot.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric'
                    });
                    const status = apiBot.active ? 'RUNNING' : 'PAUSED';

                    return {
                        id: apiBot._id,
                        name: apiBot.name,
                        status: status,
                        type: apiBot.botType.toUpperCase(),
                        tradingMode: apiBot.marketType === 'FUTURES' ? 'FUTURES' : 'SPOT',
                        symbol: apiBot.symbol,
                        startedAt: startDate,
                        pnl: apiBot.pnl.total.toFixed(2),
                        rawPnl: apiBot.pnl.total
                    };
                });
                setBots(mappedBots);
            } else {
                addToast({ title: "Error", message: res.error || "Failed to load user bots", type: "error" });
            }
        } catch (error) {
            console.error(error);
            addToast({ title: "Network Error", message: "Error connecting to server", type: "error" });
        } finally {
            setIsLoading(false);
        }
    }, [userId, addToast]);

    useEffect(() => {
        fetchUserBots();
    }, [fetchUserBots]);

    // Filtering & Sorting Logic
    const filteredBots = useMemo(() => {
        let result = bots.filter(b =>
            (b.name.toLowerCase().includes(botSearch.toLowerCase()) ||
                b.id.toLowerCase().includes(botSearch.toLowerCase())) &&
            botStatusFilters[b.status as keyof typeof botStatusFilters]
        )
        if (botSort === 'PNL_DESC') result = result.sort((a, b) => b.rawPnl - a.rawPnl)
        else if (botSort === 'PNL_ASC') result = result.sort((a, b) => a.rawPnl - b.rawPnl)
        return result
    }, [bots, botSearch, botStatusFilters, botSort])

    const BOT_PAGE_SIZE = 5;
    const paginatedBots = useMemo(() => {
        const start = (botPage - 1) * BOT_PAGE_SIZE
        return filteredBots.slice(start, start + BOT_PAGE_SIZE)
    }, [filteredBots, botPage])
    const totalBotPages = Math.ceil(filteredBots.length / BOT_PAGE_SIZE)

    const toggleBotStatus = (key: keyof typeof botStatusFilters) => {
        setBotStatusFilters(prev => ({ ...prev, [key]: !prev[key] }));
        setBotPage(1);
    }

    const getBotStatusColor = (status: string) => {
        switch (status) {
            case 'RUNNING': return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse'
            case 'PAUSED': return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
            case 'STOPPED': case 'ERROR': return 'bg-rose-500'
            default: return 'bg-zinc-600'
        }
    }

    return (
        <div className="space-y-4 animate-enter">
            <div className="flex flex-col md:flex-row gap-4 mb-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-zinc-600" size={14} />
                    <input
                        placeholder="Filter Bots..."
                        className="w-full bg-black border border-zinc-800 py-2 pl-9 text-xs text-white focus:border-white outline-none placeholder-zinc-700"
                        value={botSearch}
                        onChange={(e) => { setBotSearch(e.target.value); setBotPage(1); }}
                    />
                </div>
                <div className="flex gap-4 items-center">
                    <div className="flex gap-4 border-r border-zinc-800 pr-4">
                        <PremiumCheckbox label="Running" checked={botStatusFilters.RUNNING} onChange={() => toggleBotStatus('RUNNING')} />
                        <PremiumCheckbox label="Paused" checked={botStatusFilters.PAUSED} onChange={() => toggleBotStatus('PAUSED')} />
                        <PremiumCheckbox label="Stopped" checked={botStatusFilters.STOPPED} onChange={() => toggleBotStatus('STOPPED')} />
                    </div>
                    <div className="relative">
                        <select className="bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 py-2 pl-3 pr-8 appearance-none outline-none focus:border-zinc-600" value={botSort} onChange={(e) => { setBotSort(e.target.value); setBotPage(1); }}>
                            <option value="DEFAULT">Default Sort</option>
                            <option value="PNL_DESC">Highest PnL</option>
                            <option value="PNL_ASC">Lowest PnL</option>
                        </select>
                        <ArrowUpDown size={12} className="absolute right-3 top-3 pointer-events-none text-zinc-500" />
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 border border-dashed border-zinc-800 rounded bg-zinc-950/50">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                    <span className="text-zinc-500 mt-4 text-xs font-mono animate-pulse">Syncing User Strategies...</span>
                </div>
            ) : (
                <>
                    {paginatedBots.map((bot) => (
                        <div key={bot.id} className="bg-zinc-950 border border-zinc-800 hover:border-zinc-500 cursor-pointer transition-colors group">
                            <Link href={`/users/${userId}/bot/${bot.id}`} className="grid grid-cols-12 items-center gap-4 p-4">
                                <div className="col-span-12 md:col-span-4 flex items-center gap-4">
                                    <div className={`w-2 h-2 rounded-full shrink-0 ${getBotStatusColor(bot.status)}`} />
                                    <div>
                                        <div className="text-sm font-bold text-white group-hover:underline">{bot.name}</div>
                                        <div className="text-[10px] font-mono text-zinc-500 flex gap-2 items-center"><span>{bot.id}</span> <span className="text-zinc-700">{'//'}</span>{' '}<Badge variant={bot.type}>{bot.type}</Badge></div>
                                    </div>
                                </div>
                                <div className="col-span-6 md:col-span-2 text-left md:text-center"><Badge variant={bot.tradingMode}>{bot.tradingMode}</Badge></div>
                                <div className="col-span-6 md:col-span-2 text-left md:text-center"><span className="block text-[9px] uppercase text-zinc-600">Symbol</span><span className="font-mono text-xs text-zinc-300">{bot.symbol}</span></div>
                                <div className="col-span-6 md:col-span-2 text-left md:text-center"><span className="block text-[9px] uppercase text-zinc-600">Started</span><span className="font-mono text-xs text-zinc-400">{bot.startedAt}</span></div>
                                <div className="col-span-6 md:col-span-2 text-right">
                                    <span className="block text-[9px] uppercase text-zinc-600">PnL</span>
                                    <div className="flex items-center justify-end gap-2">
                                        <span className={`font-mono font-bold text-xs ${parseFloat(bot.pnl) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            ${bot.pnl}
                                        </span>
                                        <div>
                                            <ChevronRight size={16} className="text-zinc-700 group-hover:text-white" />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    ))}
                    {paginatedBots.length === 0 && (
                        <div className="text-center py-12 text-zinc-500 text-xs border border-zinc-900 border-dashed">No bots found matching criteria.</div>
                    )}
                </>
            )}
            <Pagination page={botPage} setPage={setBotPage} total={totalBotPages} label="Bots" />
        </div>
    )
}
