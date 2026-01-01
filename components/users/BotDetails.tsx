'use client'

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from 'next/navigation';
import {
    Activity, ArrowLeft, BarChart2, CheckCircle,
    Power, Settings, XCircle, Loader2, RefreshCw
} from "lucide-react";

// Shared Components (Assuming these exist in your project based on context)
import { PremiumCheckbox } from "@/components/common/PremiumCheckbox";
import { Pagination } from "@/components/common/Pagination";
import { Badge } from "@/components/common/Badge"; // Assuming you have this
import { useToast } from "@/components/providers/ToastProvider";
import { getData } from "@/actions/get";
import LogsConsole from "@/components/users/LogsConsole";

// --- Types ---

// 1. The API Response Type
type ApiBot = {
    _id: string;
    name: string;
    symbol: string;
    botType: 'indicator' | 'grid' | 'dca';
    active: boolean;
    createdAt: string;
    strategy: string;
    marketType?: string; // 'SPOT' | 'FUTURES'
    direction?: 'LONG' | 'SHORT' | 'NEUTRAL';
    exchange?: string;

    // Configs
    gridConfig?: {
        lowerPrice: number;
        upperPrice: number;
        gridCount: number;
        takeProfitPercent: number;
        stopLossPercent: number;
    };
    baseOrderVolume?: number;
    safetyOrderVolume?: number;
    maxSafetyOrders?: number;
    takeProfitPercent?: number;
    stopLossPercent?: number;

    indicators?: { name: string; timeframe: string; params?: string }[];

    // Stats
    pnl: { pct: number; total: number };
    marketInfo?: { lastSignal?: string };
};

// 2. The UI View Model (Merged real + mock)
interface BotViewModel {
    id: string;
    name: string;
    type: string;
    symbol: string;
    tradingMode: string; // Spot/Futures
    status: 'ACTIVE' | 'PAUSED';
    exchange: string;
    marketType: string;
    investment: string;
    mode: string;
    direction: string;
    riskStrategy: string;
    indicators: { name: string; tf: string; params: string }[];
    securityIndicator: string;
    riskParams: string;
    botTPSL: string;
    posTPSL: string;
    maxLoss: string;
    metrics: {
        roi: string;
        winRate: string;
        drawdown: string;
        profitFactor: string;
        sharpe: string;
        totalTrades: number;
    };
}

const generateMockTrades = (count: number) => {
    return Array.from({ length: count }).map((_, i) => {
        const isBuy = Math.random() > 0.5;
        const statusRandom = Math.random();
        const status = statusRandom > 0.8 ? 'PENDING' : statusRandom > 0.1 ? 'FILLED' : 'REJECTED';
        const pnl = status === 'FILLED' ? (Math.random() * 50 - 20).toFixed(2) : null;

        return {
            time: new Date(Date.now() - i * 1000 * 60 * 60).toLocaleTimeString(),
            side: isBuy ? 'BUY' : 'SELL',
            price: (Math.random() * 2000 + 1000).toFixed(2),
            status: status,
            pnl: pnl ? `${Number(pnl) > 0 ? '+' : ''}$${pnl}` : null
        };
    });
};

// --- Component ---

interface BotDetailsPageProps {
    botId: string;
    userId: string;
}

const BotDetailsPage = ({ botId, userId }: BotDetailsPageProps) => {
    const router = useRouter();
    const { addToast } = useToast();

    // Data State
    const [bot, setBot] = useState<BotViewModel | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const [ledgerFilter, setLedgerFilter] = useState({
        buy: true,
        sell: true,
        filled: true,
        rejected: true
    });

    const [tradePage, setTradePage] = useState(1);

    const tradesPageSize = 14;

    // --- Data Fetching ---
    const fetchBotData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Fetch logic based on your second example
            const res = await getData(`/bots?userId=${userId}`);

            if (res.success) {
                const apiBot: ApiBot = res.bots.find((b: ApiBot) => b._id === botId);

                if (!apiBot) {
                    addToast({ title: "Error", message: "Bot not found", type: "error" });
                    return;
                }

                // --- MAPPING LOGIC: Merge API Data with Mocks ---

                // 1. Calculate Investment (Mock logic based on API data)
                let investment = "1,000"; // Default mock
                if (apiBot.botType === 'dca' && apiBot.baseOrderVolume) {
                    investment = ((apiBot.baseOrderVolume + (apiBot.safetyOrderVolume || 0) * (apiBot.maxSafetyOrders || 0))).toLocaleString();
                }

                // 2. Format TP/SL
                const tp = apiBot.takeProfitPercent || apiBot.gridConfig?.takeProfitPercent || 1.5;
                const sl = apiBot.stopLossPercent || apiBot.gridConfig?.stopLossPercent || 5.0;

                // 3. Create View Model
                const mappedBot: BotViewModel = {
                    id: apiBot._id,
                    name: apiBot.name,
                    type: apiBot.botType.toUpperCase(),
                    symbol: apiBot.symbol,
                    tradingMode: apiBot.marketType === 'FUTURES' ? 'PERP' : 'SPOT',
                    status: apiBot.active ? 'ACTIVE' : 'PAUSED',
                    exchange: apiBot.exchange || 'BINANCE', // Mock if missing
                    marketType: apiBot.marketType || 'SPOT',
                    investment: investment,
                    mode: apiBot.strategy || 'Manual',
                    direction: apiBot.direction || 'LONG',
                    riskStrategy: apiBot.botType === 'grid' ? 'Grid Step' : 'Martingale', // Mock based on type

                    // Indicators: Use API or Mock
                    indicators: apiBot.indicators?.length ? apiBot.indicators.map(i => ({
                        name: i.name,
                        tf: i.timeframe,
                        params: i.params || '14, 3, 3'
                    })) : [
                        { name: "RSI", tf: "15m", params: "14" },
                        { name: "Bollinger Bands", tf: "1h", params: "20, 2" }
                    ],

                    securityIndicator: "ATR Volatility Guard", // Mock
                    riskParams: apiBot.botType === 'dca'
                        ? `Max Orders: ${apiBot.maxSafetyOrders || 5}`
                        : `Grid Lines: ${apiBot.gridConfig?.gridCount || 10}`,

                    botTPSL: `${tp}% / ${sl}%`,
                    posTPSL: "Dynamic",
                    maxLoss: `-$${(Number(investment.replace(',','')) * 0.2).toFixed(0)}`, // Mock 20% max loss

                    // Metrics: Mix of Real (PnL) and Mock
                    metrics: {
                        roi: apiBot.pnl.pct.toFixed(2),
                        winRate: (Math.random() * (85 - 45) + 45).toFixed(1), // Mock
                        drawdown: (Math.random() * 15).toFixed(2), // Mock
                        profitFactor: (Math.random() * (2.5 - 1.1) + 1.1).toFixed(2), // Mock
                        sharpe: (Math.random() * 3).toFixed(2), // Mock
                        totalTrades: apiBot.pnl.total > 0 ? Math.floor(Math.random() * 200 + 20) : 0 // Mock count based on activity
                    }
                };

                setBot(mappedBot);
            } else {
                addToast({ title: "Error", message: res.error || "Failed to load bot", type: "error" });
            }
        } catch (error) {
            console.error(error);
            addToast({ title: "Error", message: "Network error", type: "error" });
        } finally {
            setIsLoading(false);
        }
    }, [botId, userId, addToast]);

    useEffect(() => {
        fetchBotData();
    }, [fetchBotData, refreshTrigger]);

    // Mock Trades based on bot data
    const tradeData = useMemo(() => {
        if (!bot) return [];
        return generateMockTrades(bot.metrics.totalTrades);
    }, [bot]);

    const filteredTrades = useMemo(() => {
        return tradeData.filter(t => {
            if (!ledgerFilter.buy && t.side === 'BUY') return false;
            if (!ledgerFilter.sell && t.side === 'SELL') return false;
            const isFilled = t.status === 'FILLED';
            if (!ledgerFilter.filled && isFilled) return false;
            return !(!ledgerFilter.rejected && !isFilled);

        });
    }, [ledgerFilter, tradeData]);

    // Pagination Logic
    const paginatedTrades = useMemo(() => {
        const start = (tradePage - 1) * tradesPageSize;
        return filteredTrades.slice(start, start + tradesPageSize);
    }, [filteredTrades, tradePage]);
    const totalTradePages = Math.ceil(filteredTrades.length / tradesPageSize);

    // Reset pagination on filter change
    useEffect(() => { setTradePage(1); }, [ledgerFilter]);


    // --- Actions ---
    const handleKill = () => {
        addToast({ title: "System Alert", message: "Termination signal sent to engine.", type: "error" });
        // Add API call here
    };

    if (isLoading) {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center animate-enter">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
                <span className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Synchronizing Bot Telemetry...</span>
            </div>
        );
    }

    if (!bot) return null;

    return (
        <div className="animate-enter">
            {/* --- Header --- */}
            <div className="flex items-center gap-4 mb-8 border-b border-zinc-800 pb-6">
                <button onClick={() => router.back()} className="p-2 border border-zinc-800 hover:bg-white hover:text-black transition-colors">
                    <ArrowLeft size={16}/>
                </button>
                <div>
                    <h1 className="text-xl font-mono text-white flex items-center gap-3">
                        {bot.name}
                        {bot.status === 'ACTIVE'
                            ? <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                            : <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                        }
                    </h1>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest flex gap-2 mt-1">
                        {bot.id} <span className="text-zinc-700">{'//'}</span>
                        <Badge variant={bot.type}>{bot.type}</Badge> <span className="text-zinc-700">{'//'}</span>
                        {bot.symbol} <span className="text-zinc-700">{'//'}</span>
                        <Badge variant={bot.tradingMode}>{bot.tradingMode}</Badge>
                    </div>
                </div>
                <div className="ml-auto flex gap-2">
                    <button
                        onClick={() => setRefreshTrigger(p => p + 1)}
                        className="px-3 py-2 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
                    >
                        <RefreshCw size={14} />
                    </button>
                    <button
                        onClick={handleKill}
                        className="px-4 py-2 bg-rose-900/10 text-rose-400 border border-rose-900/50 text-xs font-bold uppercase hover:bg-rose-900 hover:text-white transition-colors flex items-center gap-2"
                    >
                        <Power size={12}/> Kill Process
                    </button>
                </div>
            </div>

            {/* --- Info Grid --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Configuration DNA */}
                <div className="border border-zinc-800 bg-zinc-950 p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                        <Settings size={120} />
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2 relative z-10">
                        <Settings size={14}/> Configuration DNA
                    </h3>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-xs relative z-10">
                        <div className="flex justify-between border-b border-zinc-900 pb-2">
                            <span className="text-zinc-600">Exchange</span>
                            <span className="text-white font-mono">{bot.exchange}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-900 pb-2">
                            <span className="text-zinc-600">Market</span>
                            <span className="text-white font-mono">{bot.marketType}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-900 pb-2">
                            <span className="text-zinc-600">Investment</span>
                            <span className="text-white font-mono">${bot.investment}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-900 pb-2">
                            <span className="text-zinc-600">Mode</span>
                            <span className="text-white font-mono">{bot.mode}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-900 pb-2">
                            <span className="text-zinc-600">Direction</span>
                            <span className={`font-mono font-bold ${bot.direction === 'LONG' ? 'text-emerald-400' : bot.direction === 'SHORT' ? 'text-rose-400' : 'text-zinc-300'}`}>{bot.direction}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-900 pb-2">
                            <span className="text-zinc-600">Risk Strategy</span>
                            <span className="text-white font-mono">{bot.riskStrategy}</span>
                        </div>

                        <div className="col-span-2 mt-2">
                            <div className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Active Indicators</div>
                            <div className="space-y-2">
                                {bot.indicators.map((ind, i) => (
                                    <div key={i} className="flex justify-between bg-zinc-900 p-2 rounded-sm border border-zinc-800">
                                        <span className="font-bold text-white">{ind.name} <span className="text-zinc-500 font-normal">({ind.tf})</span></span>
                                        <span className="font-mono text-zinc-400">{ind.params}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="col-span-2 flex justify-between border-b border-zinc-900 pb-2 mt-2">
                            <span className="text-zinc-600">Security Indicator</span>
                            <span className="text-indigo-400 font-mono">{bot.securityIndicator}</span>
                        </div>

                        <div className="col-span-2 flex justify-between border-b border-zinc-900 pb-2">
                            <span className="text-zinc-600">Risk Params</span>
                            <span className="text-amber-500 font-mono">{bot.riskParams}</span>
                        </div>
                        <div className="col-span-2 flex justify-between border-b border-zinc-900 pb-2">
                            <span className="text-zinc-600">Bot TP/SL</span>
                            <span className="text-zinc-300 font-mono">{bot.botTPSL}</span>
                        </div>
                        <div className="col-span-2 flex justify-between border-b border-zinc-900 pb-2">
                            <span className="text-zinc-600">Position TP/SL</span>
                            <span className="text-zinc-300 font-mono">{bot.posTPSL}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-900 pb-2">
                            <span className="text-zinc-600">Max Loss Limit</span>
                            <span className="text-rose-400 font-bold font-mono">{bot.maxLoss}</span>
                        </div>
                    </div>
                </div>

                {/* Performance Matrix */}
                <div className="border border-zinc-800 bg-zinc-950 p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                        <BarChart2 size={120} />
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2 relative z-10">
                        <BarChart2 size={14}/> Performance Matrix
                    </h3>
                    <div className="grid grid-cols-2 gap-4 relative z-10">
                        <div className="bg-black border border-zinc-900 p-4 flex flex-col justify-between">
                            <div className="text-[10px] uppercase text-zinc-600">Total ROI</div>
                            <div className={`text-2xl font-mono ${parseFloat(bot.metrics.roi) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {parseFloat(bot.metrics.roi) >= 0 ? '+' : ''}{bot.metrics.roi}%
                            </div>
                        </div>
                        <div className="bg-black border border-zinc-900 p-4 flex flex-col justify-between">
                            <div className="text-[10px] uppercase text-zinc-600">Win Rate</div>
                            <div className="text-2xl font-mono text-white">
                                {bot.metrics.winRate}%
                            </div>
                        </div>
                        <div className="bg-black border border-zinc-900 p-4 flex flex-col justify-between">
                            <div className="text-[10px] uppercase text-zinc-600">Max Drawdown</div>
                            <div className="text-xl font-mono text-rose-400">
                                -{bot.metrics.drawdown}%
                            </div>
                        </div>
                        <div className="bg-black border border-zinc-900 p-4 flex flex-col justify-between">
                            <div className="text-[10px] uppercase text-zinc-600">Profit Factor</div>
                            <div className="text-xl font-mono text-indigo-400">
                                {bot.metrics.profitFactor}
                            </div>
                        </div>
                        <div className="bg-black border border-zinc-900 p-4 flex flex-col justify-between col-span-2">
                            <div className="flex justify-between items-center">
                                <div className="text-[10px] uppercase text-zinc-600">Sharpe Ratio</div>
                                <div className="text-xl font-mono text-zinc-300">{bot.metrics.sharpe}</div>
                            </div>
                            <div className="h-1 w-full bg-zinc-900 mt-2">
                                <div className="h-full bg-zinc-500" style={{width: `${(parseFloat(bot.metrics.sharpe)/3)*100}%`}}></div>
                            </div>
                        </div>
                        <div className="bg-black border border-zinc-900 p-4 flex flex-col justify-between col-span-2">
                            <div className="flex justify-between items-center">
                                <div className="text-[10px] uppercase text-zinc-600">Total Trades Executed</div>
                                <div className="text-xl font-mono text-white">{bot.metrics.totalTrades}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Tables Grid --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Trades Table */}
                <div className="lg:col-span-3 border border-zinc-800 bg-zinc-950 flex flex-col h-187.5">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 pb-2 gap-4">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2"><Activity size={14} /> Execution Ledger</h3>

                        <div className="flex gap-4">
                            <PremiumCheckbox label="Buy" checked={ledgerFilter.buy} onChange={() => setLedgerFilter(prev => ({...prev, buy: !prev.buy}))} />
                            <PremiumCheckbox label="Sell" checked={ledgerFilter.sell} onChange={() => setLedgerFilter(prev => ({...prev, sell: !prev.sell}))} />
                            <div className="w-px h-3 bg-zinc-800 self-center"></div>
                            <PremiumCheckbox label="Filled" checked={ledgerFilter.filled} onChange={() => setLedgerFilter(prev => ({...prev, filled: !prev.filled}))} />
                            <PremiumCheckbox label="Rejected" checked={ledgerFilter.rejected} onChange={() => setLedgerFilter(prev => ({...prev, rejected: !prev.rejected}))} />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-2">
                        <table className="w-full text-left text-xs font-mono relative table-fixed">
                            <thead className="text-zinc-600 font-normal uppercase sticky top-0 bg-zinc-950 z-10 shadow-sm shadow-black">
                            <tr>
                                <th className="pb-3 pl-2 pt-2 border-b border-zinc-800 w-[30%]">Time</th>
                                <th className="pb-3 pt-2 border-b border-zinc-800 w-[15%]">Side</th>
                                <th className="pb-3 pt-2 border-b border-zinc-800 w-[20%]">Price</th>
                                <th className="pb-3 pt-2 border-b border-zinc-800 w-[20%]">Status</th>
                                <th className="pb-3 pt-2 text-right pr-2 border-b border-zinc-800 w-[15%]">PnL</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-900">
                            {paginatedTrades.map((trade, i) => (
                                <tr key={i} className="hover:bg-zinc-900/50 transition-colors">
                                    <td className="py-3 pl-2 text-zinc-500">{trade.time}</td>
                                    <td className={`py-3 font-bold ${trade.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>{trade.side}</td>
                                    <td className="py-3 text-zinc-300">${Number(trade.price).toLocaleString()}</td>
                                    <td className="py-3">
                                        {trade.status === 'FILLED' && <span className="flex items-center gap-1 text-emerald-400"><CheckCircle size={10}/> FILLED</span>}
                                        {trade.status === 'REJECTED' && <span className="flex items-center gap-1 text-rose-400"><XCircle size={10}/> REJECTED</span>}
                                        {trade.status === 'PENDING' && <span className="flex items-center gap-1 text-amber-500"><Activity size={10}/> PENDING</span>}
                                    </td>
                                    <td className={`py-3 text-right pr-2 ${trade.pnl?.includes('+') ? 'text-emerald-400' : 'text-zinc-700'}`}>{trade.pnl || '-'}</td>
                                </tr>
                            ))}
                            {filteredTrades.length === 0 && (
                                <tr><td colSpan={5} className="py-8 text-center text-zinc-600 italic">No trades matching filter criteria</td></tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                    <Pagination page={tradePage} setPage={setTradePage} total={totalTradePages} label="Trades" />
                </div>

                {/* Logs Console */}
                <LogsConsole botId={botId} />
            </div>
        </div>
    );
};

export default BotDetailsPage;
