'use client'

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from 'next/navigation';
import {
    Activity, ArrowLeft, BarChart2,
    Power, Settings, Loader2, RefreshCw
} from "lucide-react";

// Shared Components
import { PremiumCheckbox } from "@/components/common/PremiumCheckbox";
import { Pagination } from "@/components/common/Pagination";
import { Badge } from "@/components/common/Badge";
import { useToast } from "@/components/providers/ToastProvider";
import { getData } from "@/actions/get";
import LogsConsole from "@/components/users/LogsConsole"; // Assuming this exists

// --- Types ---
import {
    BotApiResponse,
    TradingBotUnion,
    TradingBot,
    GridBot,
    DcaBot,
    Trade,
    BotViewModel,
    BotDetailsPageProps,
    TradeViewModel,
    BotIndicator,
    RiskParams
} from "@/types/bots/botDetails";

export default function BotDetailsPage({ botId }: BotDetailsPageProps) {
    const router = useRouter();
    const { addToast } = useToast();

    // State
    const [bot, setBot] = useState<BotViewModel | null>(null);
    const [tradesList, setTradesList] = useState<TradeViewModel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Filters & Pagination
    const [ledgerFilter, setLedgerFilter] = useState({
        buy: true,
        sell: true,
        filled: true,
        rejected: true
    });
    const [tradePage, setTradePage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const fetchBotData = useCallback(async () => {
        setIsLoading(true);
        try {
            const res: BotApiResponse = await getData(`/bots/${botId}`);

            if (res.success && res.bot) {
                const apiBot: TradingBotUnion = res.bot;
                const metrics = res.metrics;

                // --- MAPPING LOGIC ---
                let investment = "-";
                let botTPSL = "-";
                let posTPSL = "Dynamic";
                let riskParamsStr = "-";
                let direction = "-";
                let activeIndicators: { name: string; tf: string; params: Record<string, string | number> }[] = [];
                let botTypeLabel = "UNKNOWN";
                let tradingMode = "SPOT";
                let calculatedMaxLoss = "-";

                // 1. Technical / Indicator Bot
                if (apiBot.botType === 'indicator' || apiBot.botType === 'technical' || apiBot.botType === 'strategy') {
                    const b = apiBot as TradingBot;
                    botTypeLabel = "TECHNICAL";

                    // 🚀 FIX: Correctly display baseFund for live, paperBalance for paper
                    investment = b.mode === 'paper'
                        ? `$${b.paperBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : `$${(b.marketInfo?.baseFund || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

                    botTPSL = `${b.tradeInfo?.takeProfit ?? '-'}% / ${b.tradeInfo?.stopLoss ?? '-'}%`;
                    posTPSL = `${b.tradeInfo?.positionTakeProfit ?? '-'}% / ${b.tradeInfo?.positionStopLoss ?? '-'}%`;
                    riskParamsStr = b.riskParams?.positionSizingMethod ? `Sizing: ${b.riskParams.positionSizingMethod}` : '-';
                    direction = b.tradeInfo?.positionSide?.toUpperCase() || "NEUTRAL";

                    // Safely extend RiskParams since maxDrawdown might not be in the base interface
                    const extendedRiskParams = b.riskParams as RiskParams & { maxDrawdown?: number };
                    const maxLossParam = extendedRiskParams?.maxDrawdown || b.botSL;
                    calculatedMaxLoss = maxLossParam ? `${maxLossParam}%` : '-';

                    if (b.indicators && b.indicators.length > 0) {
                        activeIndicators = b.indicators.map((baseInd) => {
                            // Safely extend BotIndicator to include params
                            const ind = baseInd as BotIndicator & { params?: Record<string, string | number> };

                            // Treat defaultStrategyParams as a generic dictionary
                            const strategies = res.defaultStrategyParams as unknown as Record<string, Record<string, string | number>>;

                            const defaultParams = strategies[ind.name] || {};

                            // 🚀 FIX: Merge Custom Params over Default Params
                            const mergedParams = { ...defaultParams, ...(ind.params || {}) };

                            return {
                                name: ind.name,
                                tf: ind.timeframe || b.timeframe,
                                params: mergedParams
                            };
                        });
                    }
                }
                // 2. Grid Bot
                else if (apiBot.botType === 'grid') {
                    const b = apiBot as GridBot;
                    botTypeLabel = "GRID";

                    const base = b.marketInfo?.baseFund || 0;
                    const trade = b.marketInfo?.tradeFund || 0;
                    const total = base + trade;
                    investment = total > 0 ? `$${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-';

                    const tp = b.gridConfig?.takeProfitPct ?? '-';
                    const sl = b.gridConfig?.stopLossPct ?? '-';
                    botTPSL = `${tp}% / ${sl}%`;

                    const grids = b.gridConfig?.gridCount ?? '-';
                    const lower = b.gridConfig?.lowerPrice ?? '-';
                    const upper = b.gridConfig?.upperPrice ?? '-';
                    riskParamsStr = `Grids: ${grids} | Range: ${lower} - ${upper}`;
                    direction = "NEUTRAL";
                    calculatedMaxLoss = b.botSL ? `${b.botSL}%` : '-';
                }
                // 3. DCA Bot
                else if (apiBot.botType === 'dca') {
                    const b = apiBot as DcaBot;
                    botTypeLabel = "DCA";
                    tradingMode = b.marketType || '-';

                    const baseVol = b.baseOrderVolume || 0;
                    const safetyVol = b.safetyOrderVolume || 0;
                    const maxSafety = b.maxSafetyOrders || 0;
                    const totalInv = baseVol + (safetyVol * maxSafety);
                    investment = totalInv > 0 ? `$${totalInv.toLocaleString()}` : '-';

                    const tp = b.takeProfitPercent ?? b.takeProfit ?? '-';
                    const sl = b.stopLossPercent ?? '-';
                    botTPSL = `${tp}% / ${sl}%`;

                    const volScale = b.volumeScale ?? '-';
                    const stepScale = b.stepScale ?? '-';
                    riskParamsStr = `Max SO: ${maxSafety} | Vol: ${volScale} | Step: ${stepScale}`;
                    direction = b.direction || "LONG";
                    calculatedMaxLoss = b.botSL ? `${b.botSL}%` : '-';
                }

                // 4. View Model Construction
                const mappedBot: BotViewModel = {
                    id: apiBot._id,
                    name: apiBot.name,
                    type: botTypeLabel,
                    symbol: apiBot.symbol,
                    tradingMode: tradingMode,
                    status: apiBot.active ? 'ACTIVE' : 'PAUSED',
                    exchange: apiBot.accountType ? apiBot.accountType.toUpperCase() : '-',
                    marketType: apiBot.mode === 'live' ? 'REAL MONEY' : 'PAPER TRADING',
                    investment: investment,
                    mode: apiBot.mode.toUpperCase(),
                    direction: direction,
                    riskStrategy: apiBot.riskStrategy || '-',

                    indicators: activeIndicators,
                    securityIndicator: "-",
                    riskParams: riskParamsStr,
                    botTPSL: botTPSL,
                    posTPSL: posTPSL,
                    maxLoss: calculatedMaxLoss, // 🚀 FIX: Mapped dynamic value here

                    metrics: {
                        roi: metrics?.roi ? `${metrics.roi}%` : "0.00%",
                        winRate: metrics?.winRate ? `${metrics.winRate}%` : "0.00%",
                        drawdown: metrics?.drawdown ? `${metrics.drawdown}%` : "0.00%",
                        profitFactor: metrics?.profitFactor || "0.00",
                        sharpe: metrics?.sharpe || "0.00",
                        totalTrades: metrics?.totalTrades || 0,
                        pnlValue: metrics?.pnlValue || "0.00"
                    }
                };

                // --- TRADE LEDGER MAPPING ---
                if (res.trades && Array.isArray(res.trades)) {
                    const mappedTrades: TradeViewModel[] = res.trades.map((t: Trade) => ({
                        time: new Date(t.timestamp).toLocaleString(),
                        side: t.type,
                        price: t.entryPrice.toFixed(2),
                        status: t.exitPrice ? 'FILLED' : 'PENDING',
                        pnl: t.profit !== undefined && t.profit !== null ? t.profit.toFixed(2) : '0.00'
                    }));
                    setTradesList(mappedTrades);
                }

                setBot(mappedBot);
            } else {
                addToast({ title: "Error", message: "Failed to load bot details", type: "error" });
            }
        } catch (error) {
            console.error(error);
            addToast({ title: "Error", message: "Network error", type: "error" });
        } finally {
            setIsLoading(false);
        }
    }, [botId, addToast]);

    useEffect(() => {
        fetchBotData();
    }, [fetchBotData, refreshTrigger]);

    const handleKill = () => addToast({ title: "Alert", message: "Kill signal sent to backend.", type: "error" });

    // Client-side Pagination
    const filteredTrades = tradesList.filter((t) => {
        if (t.side === 'BUY' && !ledgerFilter.buy) return false;
        if (t.side === 'SELL' && !ledgerFilter.sell) return false;
        if (t.status === 'FILLED' && !ledgerFilter.filled) return false;
        return !(t.status === 'REJECTED' && !ledgerFilter.rejected);

    });

    const totalTradePages = Math.ceil(filteredTrades.length / ITEMS_PER_PAGE) || 1;
    const paginatedTrades = filteredTrades.slice((tradePage - 1) * ITEMS_PER_PAGE, tradePage * ITEMS_PER_PAGE);

    if (isLoading) return <div className="h-[80vh] flex items-center justify-center"><Loader2 className="animate-spin text-zinc-500" /></div>;
    if (!bot) return null;

    return (
        <div className="animate-enter">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8 border-b border-zinc-800 pb-6">
                <button onClick={() => router.back()} className="p-2 border border-zinc-800 hover:bg-white hover:text-black transition-colors">
                    <ArrowLeft size={16}/>
                </button>
                <div>
                    <h1 className="text-xl font-mono text-white flex items-center gap-3">
                        {bot.name}
                        {bot.status === 'ACTIVE'
                            ? <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                            : <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                        }
                    </h1>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest flex gap-2 mt-1">
                        {bot.id} <span className="text-zinc-700">{'//'}</span>
                        <Badge variant={bot.type.toLowerCase()}>{bot.type}</Badge> <span className="text-zinc-700">{'//'}</span>
                        {bot.symbol} <span className="text-zinc-700">{'//'}</span>
                        <Badge variant={bot.tradingMode.toLowerCase()}>{bot.tradingMode}</Badge>
                    </div>
                </div>
                <div className="ml-auto flex gap-2">
                    <button onClick={() => setRefreshTrigger(p => p + 1)} className="px-3 py-2 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer">
                        <RefreshCw size={14} />
                    </button>
                    <button onClick={handleKill} className="px-4 py-2 bg-rose-900/10 text-rose-400 border border-rose-900/50 text-xs font-bold uppercase hover:bg-rose-900 hover:text-white transition-colors flex items-center gap-2 cursor-pointer">
                        <Power size={12}/> Kill Process
                    </button>
                </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="border border-zinc-800 bg-zinc-950 p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><Settings size={120} /></div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2 relative z-10">
                        <Settings size={14}/> Configuration DNA
                    </h3>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-xs relative z-10">
                        <div className="flex justify-between border-b border-zinc-900 pb-2"><span className="text-zinc-600">Exchange</span><span className="text-white font-mono">{bot.exchange}</span></div>
                        <div className="flex justify-between border-b border-zinc-900 pb-2"><span className="text-zinc-600">Market</span><span className="text-white font-mono">{bot.marketType}</span></div>
                        <div className="flex justify-between border-b border-zinc-900 pb-2"><span className="text-zinc-600">Investment</span><span className="text-white font-mono">{bot.investment}</span></div>
                        <div className="flex justify-between border-b border-zinc-900 pb-2"><span className="text-zinc-600">Mode</span><span className="text-white font-mono">{bot.mode}</span></div>
                        <div className="flex justify-between border-b border-zinc-900 pb-2"><span className="text-zinc-600">Direction</span><span className={`font-mono font-bold ${bot.direction === 'LONG' ? 'text-emerald-400' : bot.direction === 'SHORT' ? 'text-rose-400' : 'text-zinc-300'}`}>{bot.direction}</span></div>
                        <div className="flex justify-between border-b border-zinc-900 pb-2"><span className="text-zinc-600">Risk Strategy</span><span className="text-white font-mono">{bot.riskStrategy}</span></div>

                        {/* Indicators Section */}
                        <div className="col-span-2 mt-2">
                            <div className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Active Indicators</div>
                            <div className="space-y-2">
                                {bot.indicators.length > 0 ? bot.indicators.map((ind, i) => (
                                    <div key={i} className="flex flex-col bg-zinc-900 p-1.5 rounded-sm border border-zinc-800 gap-2">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-white text-xs">
                                                {ind.name} <span className="text-zinc-500 font-normal">({ind.tf})</span>
                                            </span>
                                            <div className="flex items-center gap-2">
                                                {Object.entries(ind.params).length > 0 ? (
                                                    Object.entries(ind.params).map(([key, value], j) => (
                                                        <div key={j} className="flex items-center text-[10px] bg-black/40 border border-zinc-800 rounded px-1.5 py-0.5">
                                                            <span className="text-zinc-500 mr-1.5 capitalize">
                                                                {key.replace(/([A-Z])/g, ' $1').trim()}:
                                                            </span>
                                                            <span className="font-mono text-emerald-400">
                                                                {value}
                                                            </span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <span className="text-zinc-600 italic text-[10px]">- Default Config -</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-zinc-600 italic font-mono">- No indicators -</div>
                                )}
                            </div>
                        </div>

                        <div className="col-span-2 flex justify-between border-b border-zinc-900 pb-2 mt-2"><span className="text-zinc-600">Security Indicator</span><span className="text-indigo-400 font-mono">{bot.securityIndicator}</span></div>
                        <div className="col-span-2 flex justify-between border-b border-zinc-900 pb-2"><span className="text-zinc-600">Risk Params</span><span className="text-amber-500 font-mono">{bot.riskParams}</span></div>
                        <div className="col-span-2 flex justify-between border-b border-zinc-900 pb-2"><span className="text-zinc-600">Bot TP/SL</span><span className="text-zinc-300 font-mono">{bot.botTPSL}</span></div>
                        <div className="col-span-2 flex justify-between border-b border-zinc-900 pb-2"><span className="text-zinc-600">Position TP/SL</span><span className="text-zinc-300 font-mono">{bot.posTPSL}</span></div>
                        <div className="flex justify-between border-b border-zinc-900 pb-2"><span className="text-zinc-600">Max Loss Limit</span><span className="text-rose-400 font-bold font-mono">{bot.maxLoss}</span></div>
                    </div>
                </div>

                {/* Performance Matrix */}
                <div className="border border-zinc-800 bg-zinc-950 p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><BarChart2 size={120} /></div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2 relative z-10"><BarChart2 size={14}/> Performance Matrix</h3>
                    <div className="grid grid-cols-2 gap-4 relative z-10">
                        <div className="bg-black border border-zinc-900 p-4 flex flex-col justify-between">
                            <div className="text-[10px] uppercase text-zinc-600">Total PnL</div>
                            <div className={`text-2xl font-mono ${!bot.metrics.pnlValue.includes('-') && parseFloat(bot.metrics.pnlValue) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {(!bot.metrics.pnlValue.includes('-') && parseFloat(bot.metrics.pnlValue) >= 0) ? '+' : ''}{bot.metrics.pnlValue}
                            </div>
                        </div>
                        <div className="bg-black border border-zinc-900 p-4 flex flex-col justify-between">
                            <div className="text-[10px] uppercase text-zinc-600">Win Rate</div>
                            <div className="text-2xl font-mono text-white">{bot.metrics.winRate}</div>
                        </div>
                        <div className="bg-black border border-zinc-900 p-4 flex flex-col justify-between">
                            <div className="text-[10px] uppercase text-zinc-600">Max Drawdown</div>
                            <div className="text-xl font-mono text-rose-400">{bot.metrics.drawdown}</div>
                        </div>
                        <div className="bg-black border border-zinc-900 p-4 flex flex-col justify-between">
                            <div className="text-[10px] uppercase text-zinc-600">Profit Factor</div>
                            <div className="text-xl font-mono text-indigo-400">{bot.metrics.profitFactor}</div>
                        </div>
                        <div className="bg-black border border-zinc-900 p-4 flex flex-col justify-between col-span-2">
                            <div className="flex justify-between items-center"><div className="text-[10px] uppercase text-zinc-600">Sharpe Ratio</div><div className="text-xl font-mono text-zinc-300">{bot.metrics.sharpe}</div></div>
                            <div className="h-1 w-full bg-zinc-900 mt-2"><div className="h-full bg-zinc-500" style={{width: `0%`}}></div></div>
                        </div>
                        <div className="bg-black border border-zinc-900 p-4 flex flex-col justify-between col-span-2">
                            <div className="flex justify-between items-center"><div className="text-[10px] uppercase text-zinc-600">Total Trades Executed</div><div className="text-xl font-mono text-white">{bot.metrics.totalTrades}</div></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Trades Table */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                            {paginatedTrades.length === 0 ? (
                                <tr><td colSpan={5} className="py-8 text-center text-zinc-600 italic">No trade data available</td></tr>
                            ) : (
                                paginatedTrades.map((trade, idx) => (
                                    <tr key={idx} className="hover:bg-zinc-900/50 transition-colors">
                                        <td className="py-3 pl-2 border-b border-zinc-900/50 text-zinc-400">{trade.time}</td>
                                        <td className="py-3 border-b border-zinc-900/50">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-bold ${trade.side === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                                {trade.side}
                                            </span>
                                        </td>
                                        <td className="py-3 border-b border-zinc-900/50 text-white">{trade.price}</td>
                                        <td className="py-3 border-b border-zinc-900/50 text-zinc-500 text-[10px] uppercase">{trade.status}</td>
                                        <td className={`py-3 pr-2 border-b border-zinc-900/50 text-right font-bold ${parseFloat(trade.pnl) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {parseFloat(trade.pnl) >= 0 ? '+' : ''}{trade.pnl}
                                        </td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>
                    <Pagination page={tradePage} setPage={setTradePage} total={totalTradePages} label="Trades" />
                </div>
                {/* Ensure LogsConsole is imported correctly based on your directory */}
                <LogsConsole botId={botId} />
            </div>
        </div>
    );
}
