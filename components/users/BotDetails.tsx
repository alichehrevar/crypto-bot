'use client'

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from 'next/navigation';
import {
    Activity, ArrowLeft, BarChart2, CheckCircle,
    Power, Settings, XCircle, Loader2, RefreshCw
} from "lucide-react";

// Shared Components
import { PremiumCheckbox } from "@/components/common/PremiumCheckbox";
import { Pagination } from "@/components/common/Pagination";
import { Badge } from "@/components/common/Badge";
import { useToast } from "@/components/providers/ToastProvider";
import { getData } from "@/actions/get";
import LogsConsole from "@/components/users/LogsConsole";

// --- Types ---

// Common fields across all bots
interface BaseBot {
    _id: string;
    name: string;
    symbol: string;
    botType: 'technical' | 'grid' | 'dca';
    userId: string;
    active: boolean;
    mode: string; // 'paper' | 'live'
    accountType: string;
    createdAt: string;
    updatedAt: string;
    riskStrategy?: string;
    cumulativePnL?: number;
    userLevel?: number;
}

// Technical Bot Specifics
interface TechnicalBot extends BaseBot {
    botType: 'technical';
    riskParams?: {
        positionSizingMethod?: string;
        riskFraction?: number;
        stopLossDistance?: number;
    };
    marketInfo?: {
        baseFund?: number;
        tradeFund?: number;
        lastSignal?: string;
        state?: string;
    };
    tradeInfo?: {
        takeProfit?: number;
        stopLoss?: number;
        leverageLong?: number;
        leverageShort?: number;
        positionSide?: string;
    };
    indicators?: Array<{
        name: string;
        timeframe: string;
        params?: Record<string, string | number | boolean>;
    }>;
}

// Grid Bot Specifics
interface GridBot extends BaseBot {
    botType: 'grid';
    gridConfig?: {
        lowerPrice: number;
        upperPrice: number;
        gridCount: number;
        gridType?: string;
        gridStepPercentage?: number;
        takeProfitPct?: number;
        stopLossPct?: number;
    };
    marketInfo?: {
        baseFund?: number;
        tradeFund?: number;
    };
    tradeInfo?: {
        leverageLong?: number;
        leverageShort?: number;
    };
}

// DCA Bot Specifics
interface DcaBot extends BaseBot {
    botType: 'dca';
    marketType?: string;
    direction?: string;
    leverage?: number;
    baseOrderVolume?: number;
    safetyOrderVolume?: number;
    maxSafetyOrders?: number;
    takeProfit?: number; // sometimes takeProfitPercent
    takeProfitPercent?: number;
    stopLoss?: number;
    stopLossPercent?: number;
    volumeScale?: number;
    stepScale?: number;
}

interface TradeViewModel {
    time: string;
    side: 'BUY' | 'SELL';
    price: string;
    status: 'FILLED' | 'REJECTED' | 'PENDING';
    pnl: string | null;
}

type ApiBot = TechnicalBot | GridBot | DcaBot;

// The UI View Model
interface BotViewModel {
    id: string;
    name: string;
    type: string;
    symbol: string;
    tradingMode: string;
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
        pnlValue: string; // Added to show cumulative PnL
    };
}

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

    // Trade filter state
    const [ledgerFilter, setLedgerFilter] = useState({
        buy: true,
        sell: true,
        filled: true,
        rejected: true
    });

    const [tradePage, setTradePage] = useState(1);

    // --- Data Fetching ---
    const fetchBotData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Updated Endpoint
            const res = await getData(`/bots/${botId}`);

            if (res.success && res.bot) {
                const apiBot: ApiBot = res.bot;

                // --- MAPPING LOGIC ---

                // 1. Calculate Investment
                let investment = "-";
                if (apiBot.botType === 'dca') {
                    const dca = apiBot as DcaBot;
                    if (dca.baseOrderVolume) {
                        const total = dca.baseOrderVolume + ((dca.safetyOrderVolume || 0) * (dca.maxSafetyOrders || 0));
                        investment = total.toLocaleString();
                    }
                } else if (apiBot.botType === 'grid') {
                    const grid = apiBot as GridBot;
                    if (grid.marketInfo?.baseFund) {
                        investment = grid.marketInfo.baseFund.toFixed(2);
                    }
                } else if (apiBot.botType === 'technical') {
                    const tech = apiBot as TechnicalBot;
                    if (tech.marketInfo?.baseFund) {
                        investment = tech.marketInfo.baseFund.toLocaleString();
                    }
                }

                // 2. Format TP/SL & Risk Params
                let botTPSL = "-";
                let riskParams = "-";
                let direction = "-";
                let activeIndicators: { name: string; tf: string; params: string }[] = [];

                if (apiBot.botType === 'technical') {
                    const b = apiBot as TechnicalBot;
                    const tp = b.tradeInfo?.takeProfit ?? 0;
                    const sl = b.tradeInfo?.stopLoss ?? 0;
                    botTPSL = `${tp}% / ${sl}%`;
                    riskParams = `Risk Frac: ${b.riskParams?.riskFraction ?? '-'} | SL Dist: ${b.riskParams?.stopLossDistance ?? '-'}`;
                    direction = b.tradeInfo?.positionSide?.toUpperCase() || "NEUTRAL";

                    if (b.indicators && b.indicators.length > 0) {
                        activeIndicators = b.indicators.map(ind => ({
                            name: ind.name,
                            tf: ind.timeframe,
                            params: ind.params ? JSON.stringify(ind.params).replace(/[{"}]/g, '').replace(/,/g, ', ') : '-'
                        }));
                    }
                }
                else if (apiBot.botType === 'grid') {
                    const b = apiBot as GridBot;
                    const tp = b.gridConfig?.takeProfitPct ?? 0;
                    const sl = b.gridConfig?.stopLossPct ?? 0;
                    botTPSL = `${tp}% / ${sl}%`;
                    riskParams = `Grids: ${b.gridConfig?.gridCount} | Step: ${b.gridConfig?.gridStepPercentage ?? '-'}%`;
                    direction = "NEUTRAL"; // Grids are usually neutral/hedged unless specified
                }
                else if (apiBot.botType === 'dca') {
                    const b = apiBot as DcaBot;
                    // Check various fields for TP/SL as structure varies slightly
                    const tp = b.takeProfit || b.takeProfitPercent || 0;
                    const sl = b.stopLoss || b.stopLossPercent || 0;
                    botTPSL = `${tp}% / ${sl}%`;
                    riskParams = `Max SO: ${b.maxSafetyOrders} | Vol Scale: ${b.volumeScale}`;
                    direction = b.direction || b.marketType || "LONG";
                }

                // 3. Create View Model
                const mappedBot: BotViewModel = {
                    id: apiBot._id,
                    name: apiBot.name,
                    type: apiBot.botType.toUpperCase(),
                    symbol: apiBot.symbol,
                    tradingMode: (apiBot.botType === 'dca' && (apiBot as DcaBot).marketType) ? (apiBot as DcaBot).marketType! : 'SPOT', // Defaulting to Spot if undefined
                    status: apiBot.active ? 'ACTIVE' : 'PAUSED',
                    exchange: apiBot.accountType ? apiBot.accountType.toUpperCase() : '-',
                    marketType: apiBot.mode === 'live' ? 'REAL MONEY' : 'PAPER TRADING',
                    investment: investment,
                    mode: apiBot.mode.toUpperCase(),
                    direction: direction,
                    riskStrategy: apiBot.riskStrategy || '-',

                    indicators: activeIndicators,

                    securityIndicator: "-", // Not present in provided JSON
                    riskParams: riskParams,
                    botTPSL: botTPSL,
                    posTPSL: "Dynamic", // Placeholder as this specific logic isn't in JSON
                    maxLoss: "-", // Logic not provided in JSON

                    // Metrics: Most are missing from the JSON examples, so we use "-"
                    metrics: {
                        roi: "-",
                        winRate: "-",
                        drawdown: "-",
                        profitFactor: "-",
                        sharpe: "-",
                        totalTrades: 0, // No trades array in provided JSON
                        pnlValue: apiBot.cumulativePnL !== undefined ? `${apiBot.cumulativePnL.toFixed(2)}` : "-"
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
    }, [botId, addToast]); // Removed userId from dependency as it's not in the new URL

    useEffect(() => {
        fetchBotData();
    }, [fetchBotData, refreshTrigger]);

    // Trade Logic - NOTE: The provided API response does not contain trade history.
    // Returning empty array to respect "no data = dash/empty" rule.
    const paginatedTrades: TradeViewModel[] = [];
    const totalTradePages = 0;

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
                                {bot.indicators.length > 0 ? bot.indicators.map((ind, i) => (
                                    <div key={i} className="flex justify-between bg-zinc-900 p-2 rounded-sm border border-zinc-800">
                                        <span className="font-bold text-white">{ind.name} <span className="text-zinc-500 font-normal">({ind.tf})</span></span>
                                        <span className="font-mono text-zinc-400 text-[10px] overflow-hidden text-ellipsis ml-2">{ind.params}</span>
                                    </div>
                                )) : (
                                    <div className="text-zinc-600 italic font-mono">- No indicators -</div>
                                )}
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
                            <div className="text-[10px] uppercase text-zinc-600">Total PnL</div>
                            <div className={`text-2xl font-mono ${!bot.metrics.pnlValue.includes('-') && parseFloat(bot.metrics.pnlValue) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {(!bot.metrics.pnlValue.includes('-') && parseFloat(bot.metrics.pnlValue) >= 0) ? '+' : ''}{bot.metrics.pnlValue}
                            </div>
                        </div>
                        <div className="bg-black border border-zinc-900 p-4 flex flex-col justify-between">
                            <div className="text-[10px] uppercase text-zinc-600">Win Rate</div>
                            <div className="text-2xl font-mono text-white">
                                {bot.metrics.winRate}
                            </div>
                        </div>
                        <div className="bg-black border border-zinc-900 p-4 flex flex-col justify-between">
                            <div className="text-[10px] uppercase text-zinc-600">Max Drawdown</div>
                            <div className="text-xl font-mono text-rose-400">
                                {bot.metrics.drawdown}
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
                                <div className="h-full bg-zinc-500" style={{width: `0%`}}></div>
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
                            {paginatedTrades.length === 0 && (
                                <tr><td colSpan={5} className="py-8 text-center text-zinc-600 italic">No trade data available</td></tr>
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
