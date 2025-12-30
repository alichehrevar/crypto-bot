// components/users/UserProfile.tsx
'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from "next/image";
import {
    ArrowLeft,
    Search,
    ChevronRight,
    ArrowUpDown,
    History,
    CreditCard,
    Settings,
    Shield,
    Key,
    LogOut,
    Flag,
    UserX,
    MapPin,
    Hash,
    Monitor,
    CheckCircle,
    XCircle,
    RefreshCw,
    FileText as InvoiceIcon,
    Loader2, Globe, Smartphone, Laptop, ExternalLink
} from 'lucide-react'

// --- Custom Imports ---
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { Pagination } from '@/components/common/Pagination'
import { PremiumCheckbox } from '@/components/common/PremiumCheckbox'
import { InteractiveChart } from '@/components/charts/InteractiveChart'
import { useToast } from '@/components/providers/ToastProvider'
import { getData } from "@/actions/get"

// --- Data & Types ---
import { MOCK_INVOICES, MOCK_ACTION_HISTORY } from '@/lib/data'
import { MOCK_PNL_DATA, MOCK_EQUITY_DATA, ActivityLog } from '@/lib/mock-service'
import { User } from "@/types/users";

// --- Types ---
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

interface UserProfileProps {
    user: User
}

// --- Mocks for sections not in User Object ---
const MOCK_BALANCE = "12,450.00"; // Mock Balance
const MOCK_BOT_COUNT_TOTAL = 12;  // Mock Total Count (if API doesn't provide summary)

const MOCK_SUB_HISTORY = [
    { date: '2024-10-01 10:00', event: 'REJOIN', plan: 'PRO', details: 'Reactivated via Email Campaign', icon: RefreshCw, color: 'text-emerald-400', border: 'border-emerald-500' },
    { date: '2024-09-15 14:30', event: 'CANCEL', plan: 'BASIC', details: 'User requested pause', icon: XCircle, color: 'text-rose-400', border: 'border-rose-500' },
    { date: '2024-01-20 11:00', event: 'JOINED', plan: 'BASIC', details: 'Initial Sign-up', icon: CheckCircle, color: 'text-zinc-500', border: 'border-zinc-500' },
]

const getTimestampFromId = (id: string) => {
    try {
        const timestamp = parseInt(id.substring(0, 8), 16) * 1000;
        return new Date(timestamp).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    } catch {
        return 'Unknown Date';
    }
};

export function UserProfile({ user }: UserProfileProps) {
    const { addToast } = useToast()
    const [tab, setTab] = useState('OVERVIEW')

    // --- Computed Data from Real User Object ---
    const fullName = `${user.info?.firstName || 'Unknown'} ${user.info?.lastName || 'User'}`;
    const locationInfo = user.locationHistory?.[0]?.deviceInfo;
    const currentLocation = locationInfo ? `${locationInfo.city || 'Unknown'}, ${locationInfo.country || 'Unknown'}` : 'Unknown Location';
    const currentIp = locationInfo?.ip || '0.0.0.0';

    // Map Role to a UI Plan Concept
    const userPlan = user.role === 'admin' ? 'PRO' : user.role === 'broker' ? 'ESSENTIAL' : 'BASIC';

    // Merge Real Location History into the Activity Log
    const activityHistory: ActivityLog[] = useMemo(() => {
        const realLogs = user.locationHistory?.map(log => ({
            time: "2024-01-01 12:00", // Timestamp missing in a log object, using placeholder or could format createdAt if available on log
            action: log.source.toUpperCase(),
            details: `Source: ${log.source} | Agent: ${log.deviceInfo.userAgent}`,
            ip: log.deviceInfo.ip
        })) || [];

        // Add some mock trade activities to make the list look full
        const mockTradeLogs: ActivityLog[] = [
            { time: '2024-10-24 14:20', action: 'BOT_START', details: 'Started DCA Bot BTC/USDT', ip: currentIp },
            { time: '2024-10-23 09:15', action: 'API_KEY_CREATE', details: 'Generated new Read-Only Key', ip: currentIp },
        ];

        return [...realLogs, ...mockTradeLogs];
    }, [user.locationHistory, currentIp]);

    // --- State ---
    const [bots, setBots] = useState<UiBot[]>([])
    const [isLoadingBots, setIsLoadingBots] = useState(false)
    const [hasLoadedBots, setHasLoadedBots] = useState(false)
    const [botSearch, setBotSearch] = useState('')
    const [chartType, setChartType] = useState<'PNL' | 'EQUITY'>('PNL')
    const [botPage, setBotPage] = useState(1)
    const [botStatusFilters, setBotStatusFilters] = useState({ RUNNING: true, PAUSED: true, STOPPED: true, ERROR: true })
    const [botSort, setBotSort] = useState('DEFAULT')
    const [invoiceSearch, setInvoiceSearch] = useState('')
    const [invoicePage, setInvoicePage] = useState(1)
    const [invoiceStatusFilters, setInvoiceStatusFilters] = useState({ PAID: true, FAILED: true })
    const [activityPage, setActivityPage] = useState(1)
    const [actionPage, setActionPage] = useState(1)
    const [locationPage, setLocationPage] = useState(1)
    const [selectedPlan, setSelectedPlan] = useState<'BASIC' | 'ESSENTIAL' | 'PRO' | 'FREE'>('BASIC')
    const [customFee, setCustomFee] = useState('49.00')

    // --- Bot Fetching ---
    const fetchUserBots = useCallback(async () => {
        setIsLoadingBots(true);
        try {
            // Using user._id from the JSON structure
            const res: DeployedBotsResponse = await getData(`/bots?userId=${user._id}`);

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
                setHasLoadedBots(true);
            } else {
                addToast({ title: "Error", message: res.error || "Failed to load user bots", type: "error" });
            }
        } catch (error) {
            console.error(error);
            addToast({ title: "Network Error", message: "Error connecting to server", type: "error" });
        } finally {
            setIsLoadingBots(false);
        }
    }, [user._id, addToast]);

    useEffect(() => {
        if (tab === 'BOTS' && !hasLoadedBots) {
            fetchUserBots().catch(() => addToast({title: 'Error', message: 'Failed to load user bots', type: 'error'}));
        }
    }, [tab, hasLoadedBots, fetchUserBots, addToast]);

    // --- Memos & Filters ---
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

    const filteredInvoices = useMemo(() => {
        return MOCK_INVOICES.filter(inv => {
            const matchesSearch = inv.id.toLowerCase().includes(invoiceSearch.toLowerCase()) || inv.amount.toLowerCase().includes(invoiceSearch.toLowerCase())
            const statusKey = inv.status === 'PAID' ? 'PAID' : 'FAILED'
            return matchesSearch && invoiceStatusFilters[statusKey]
        })
    }, [invoiceSearch, invoiceStatusFilters])

    const INVOICE_PAGE_SIZE = 5;
    const paginatedInvoices = useMemo(() => {
        const start = (invoicePage - 1) * INVOICE_PAGE_SIZE
        return filteredInvoices.slice(start, start + INVOICE_PAGE_SIZE)
    }, [filteredInvoices, invoicePage])
    const totalInvoicePages = Math.ceil(filteredInvoices.length / INVOICE_PAGE_SIZE)

    const ACTIVITY_PAGE_SIZE = 6;
    const paginatedActivity = useMemo(() => {
        const start = (activityPage - 1) * ACTIVITY_PAGE_SIZE
        return activityHistory.slice(start, start + ACTIVITY_PAGE_SIZE)
    }, [activityHistory, activityPage])
    const totalActivityPages = Math.ceil(activityHistory.length / ACTIVITY_PAGE_SIZE)

    const ACTION_PAGE_SIZE = 5;
    const paginatedActions = useMemo(() => {
        const start = (actionPage - 1) * ACTION_PAGE_SIZE
        return MOCK_ACTION_HISTORY.slice(start, start + ACTION_PAGE_SIZE)
    }, [actionPage])
    const totalActionPages = Math.ceil(MOCK_ACTION_HISTORY.length / ACTION_PAGE_SIZE)

    const LOCATION_PAGE_SIZE = 5;
    const paginatedLocations = useMemo(() => {
        // Safe check if locationHistory exists
        const history = user.locationHistory || [];
        const start = (locationPage - 1) * LOCATION_PAGE_SIZE;
        return history.slice(start, start + LOCATION_PAGE_SIZE);
    }, [user.locationHistory, locationPage]);
    const totalLocationPages = Math.ceil((user.locationHistory?.length || 0) / LOCATION_PAGE_SIZE);

    // --- Handlers ---
    const handleBotSearch = (e: React.ChangeEvent<HTMLInputElement>) => { setBotSearch(e.target.value); setBotPage(1); }
    const toggleBotStatus = (key: keyof typeof botStatusFilters) => { setBotStatusFilters(prev => ({ ...prev, [key]: !prev[key] })); setBotPage(1); }
    const handleBotSort = (e: React.ChangeEvent<HTMLSelectElement>) => { setBotSort(e.target.value); setBotPage(1); }
    const handleInvoiceSearch = (e: React.ChangeEvent<HTMLInputElement>) => { setInvoiceSearch(e.target.value); setInvoicePage(1); }
    const toggleInvoiceStatus = (key: keyof typeof invoiceStatusFilters) => { setInvoiceStatusFilters(prev => ({ ...prev, [key]: !prev[key] })); setInvoicePage(1); }

    const getBotStatusColor = (status: string) => {
        switch (status) {
            case 'RUNNING': return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse'
            case 'PAUSED': return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
            case 'STOPPED': case 'ERROR': return 'bg-rose-500'
            default: return 'bg-zinc-600'
        }
    }

    return (
        <div className="animate-enter space-y-6">
            <Link
                href="/users"
                className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 uppercase tracking-widest transition-colors"
            >
                <ArrowLeft size={14} /> Return to Hub
            </Link>

            {/* --- Header Section (Real Data) --- */}
            <div className="flex flex-col lg:flex-row gap-6 mb-8 items-stretch">
                <Card className="flex-1 flex flex-col md:flex-row gap-6 items-center md:items-start border-t-4 border-t-white">
                    <div className="w-24 h-24 relative">
                        {/* Handling Avatar Path */}
                        <Image
                            fill
                            src={user.info.avatar ? (process.env.CDN_URL! + user.info.avatar) : '/images/default-avatar.png'}
                            className="w-24 h-24 rounded-full border-2 border-zinc-800 grayscale object-contain"
                            alt={fullName}
                        />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-3xl font-light text-white uppercase">
                            {fullName}
                        </h1>
                        <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-2 text-xs font-mono text-zinc-500">
                            <span className="flex items-center gap-1"><Hash size={12} /> {user._id}</span>
                            <span className="flex items-center gap-1"><MapPin size={12} /> {locationInfo?.country || 'Unknown'}</span>
                        </div>
                        <div className="mt-4 flex gap-2 justify-center md:justify-start">
                            <Badge variant={user.status}>{user.status.toUpperCase()}</Badge>
                            <Badge variant="outline">KYC L2 VERIFIED</Badge>
                        </div>
                    </div>
                </Card>
                <div className="w-full lg:w-96 grid grid-cols-2 gap-4">
                    <Card className="flex flex-col justify-between py-4 h-full">
                        <div className="text-[10px] uppercase text-zinc-500 font-bold mb-1">Total Equity (Est.)</div>
                        <div className="text-lg font-mono text-white truncate">${MOCK_BALANCE}</div>
                    </Card>
                    <Card className="flex flex-col justify-between py-4 h-full">
                        <div className="text-[10px] uppercase text-zinc-500 font-bold mb-1">Available Fund</div>
                        <div className="text-lg font-mono text-zinc-400 truncate">${(parseFloat(MOCK_BALANCE.replace(',','')) * 0.4).toFixed(2)}</div>
                    </Card>
                    <Card className="flex flex-col justify-between py-4 h-full">
                        <div className="text-[10px] uppercase text-zinc-500 font-bold mb-1">Active bots</div>
                        <div className="text-lg font-mono text-emerald-400">{Math.floor(MOCK_BOT_COUNT_TOTAL * 0.8)}</div>
                    </Card>
                    <Card className="flex flex-col justify-between py-4 h-full">
                        <div className="text-[10px] uppercase text-zinc-500 font-bold mb-1">Total Deployed</div>
                        <div className="text-lg font-mono text-white">{MOCK_BOT_COUNT_TOTAL}</div>
                    </Card>
                </div>
            </div>

            {/* --- Tabs --- */}
            <div className="border-b border-zinc-800 flex overflow-x-auto">
                {['OVERVIEW', 'BOTS', 'BILLING', 'ACTION'].map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-8 py-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap
              ${tab === t ? 'border-white text-white bg-zinc-900/30' : 'border-transparent text-zinc-600 hover:text-white'}
            `}
                    >
                        {t}
                    </button>
                ))}
            </div>

            <div className="min-h-100">
                {/* --- Overview Tab --- */}
                {tab === 'OVERVIEW' && (
                    <div key="overview" className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-enter items-stretch">
                        <InteractiveChart data={chartType === 'PNL' ? MOCK_PNL_DATA : MOCK_EQUITY_DATA} type={chartType} setType={setChartType} className="h-64" />

                        {/* Dossier Card with Real Data */}
                        <Card className="h-64 flex flex-col">
                            <h3 className="text-xs font-bold uppercase text-zinc-500 mb-6">Dossier</h3>
                            <div className="space-y-4 text-sm flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                <div className="flex justify-between border-b border-zinc-900 pb-2">
                                    <span className="text-zinc-500">Email</span>
                                    <span className="text-zinc-300">{user.email}</span>
                                </div>
                                <div className="flex justify-between border-b border-zinc-900 pb-2">
                                    <span className="text-zinc-500">Phone</span>
                                    <span className="text-zinc-300">+1 202 555 0192 (Mock)</span>
                                </div>
                                <div className="flex justify-between border-b border-zinc-900 pb-2">
                                    <span className="text-zinc-500">Current Plan</span>
                                    <span className="text-white font-bold">{userPlan} <span className="text-zinc-500 font-normal">(Monthly)</span></span>
                                </div>
                                <div className="flex justify-between border-b border-zinc-900 pb-2">
                                    <span className="text-zinc-500">Brokers</span>
                                    <span className="text-zinc-300 flex gap-2">
                                        <span className="bg-zinc-900 px-1 border border-zinc-800 text-[10px]">Binance</span>
                                        <span className="bg-zinc-900 px-1 border border-zinc-800 text-[10px]">ByBit</span>
                                    </span>
                                </div>
                                <div className="pt-2 mt-auto">
                                    <h4 className="text-[10px] uppercase font-bold text-zinc-500 mb-2">Last Known Session</h4>
                                    <div className="flex justify-between items-center bg-zinc-900 p-3 border border-zinc-800 rounded">
                                        <div className="flex items-center gap-2">
                                            <Monitor size={14} className="text-zinc-500" />
                                            <span className="text-zinc-300 font-mono text-xs">{currentIp}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                                            <MapPin size={10} /> {currentLocation}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Activity Stream using Location History + Mock */}
                        <div className="lg:col-span-2 border border-zinc-800 bg-zinc-950 p-0">
                            <div className="p-6 pb-2">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                                    <History size={14} /> User Activity Stream
                                </h3>
                            </div>
                            <div className="space-y-4 px-6 pb-4">
                                {paginatedActivity.length > 0 ? paginatedActivity.map((act: ActivityLog, i: number) => (
                                    <div key={i} className="flex items-start gap-4 border-b border-zinc-900/50 pb-3 last:border-0 last:pb-0">
                                        <div className="min-w-25 text-[10px] font-mono text-zinc-500 pt-0.5">{act.time}</div>
                                        <div className="flex-1">
                                            <div className="text-xs font-bold text-white">{act.action}</div>
                                            <div className="text-[10px] text-zinc-400">{act.details}</div>
                                        </div>
                                        {act.ip && (
                                            <div className="text-[10px] font-mono text-zinc-600 bg-zinc-900 px-2 py-0.5 rounded">{act.ip}</div>
                                        )}
                                    </div>
                                )) : (
                                    <div className="text-zinc-500 text-xs text-center py-4">No activity recorded.</div>
                                )}
                            </div>
                            <Pagination page={activityPage} setPage={setActivityPage} total={totalActivityPages} label="Activity" />
                        </div>

                        <div className="lg:col-span-2 border border-zinc-800 bg-zinc-950 p-0">
                            <div className="p-6 pb-2">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                                    <Globe size={14} /> Global Location History
                                </h3>
                            </div>

                            <div className="overflow-x-auto px-6 pb-4">
                                <table className="w-full text-left text-sm">
                                    <thead className="text-[10px] text-zinc-600 uppercase border-b border-zinc-900">
                                    <tr>
                                        <th className="pb-3 pl-2 font-normal text-left">Timestamp</th>
                                        <th className="pb-3 font-normal text-left">Location</th>
                                        <th className="pb-3 font-normal text-left">Device</th>
                                        <th className="pb-3 font-normal text-left">Source</th>
                                        <th className="pb-3 pr-2 font-normal text-right">Coordinates</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-900">
                                    {paginatedLocations.length > 0 ? paginatedLocations.map((log) => {
                                        const time = getTimestampFromId(log._id);
                                        const isMobile = log.deviceInfo.userAgent.toLowerCase().includes('mobile');

                                        return (
                                            <tr key={log._id} className="group hover:bg-zinc-900/30 transition-colors">
                                                <td className="py-3 pl-2 font-mono text-zinc-500 text-xs">
                                                    {time}
                                                </td>
                                                <td className="py-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-white text-xs font-bold">{log.deviceInfo.city}, {log.deviceInfo.country}</span>
                                                        <span className="text-[10px] font-mono text-zinc-500">{log.deviceInfo.ip}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3">
                                                    <div className="flex items-center gap-2">
                                                        {isMobile ? <Smartphone size={14} className="text-zinc-600" /> : <Laptop size={14} className="text-zinc-600" />}
                                                        <span className="text-zinc-400 text-xs truncate max-w-37.5 block" title={log.deviceInfo.userAgent}>
                                                                {log.deviceInfo.userAgent}
                                                            </span>
                                                    </div>
                                                </td>
                                                <td className="py-3">
                                                    <Badge variant={log.source === 'login' ? 'RUNNING' : 'BASIC'}>
                                                        {log.source.toUpperCase()}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 pr-2 text-right">
                                                    <a
                                                        href={`https://www.google.com/maps/search/?api=1&query=${log.location.coordinates[1]},${log.location.coordinates[0]}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1 text-[10px] font-mono text-zinc-500 hover:text-emerald-400 transition-colors border border-zinc-800 hover:border-emerald-500/50 rounded px-2 py-1 bg-black"
                                                    >
                                                        {log.location.coordinates[1].toFixed(4)}, {log.location.coordinates[0].toFixed(4)}
                                                        <ExternalLink size={8} />
                                                    </a>
                                                </td>
                                            </tr>
                                        )
                                    }) : (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-zinc-500 text-xs italic">
                                                No location history found for this user.
                                            </td>
                                        </tr>
                                    )}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination page={locationPage} setPage={setLocationPage} total={totalLocationPages} label="Locations" />
                        </div>
                    </div>
                )}

                {/* --- Bots Tab --- */}
                {tab === 'BOTS' && (
                    <div key="bots" className="space-y-4 animate-enter">
                        <div className="flex flex-col md:flex-row gap-4 mb-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-2.5 text-zinc-600" size={14} />
                                <input
                                    placeholder="Filter Bots..."
                                    className="w-full bg-black border border-zinc-800 py-2 pl-9 text-xs text-white focus:border-white outline-none placeholder-zinc-700"
                                    value={botSearch}
                                    onChange={handleBotSearch}
                                />
                            </div>
                            <div className="flex gap-4 items-center">
                                <div className="flex gap-4 border-r border-zinc-800 pr-4">
                                    <PremiumCheckbox label="Running" checked={botStatusFilters.RUNNING} onChange={() => toggleBotStatus('RUNNING')} />
                                    <PremiumCheckbox label="Paused" checked={botStatusFilters.PAUSED} onChange={() => toggleBotStatus('PAUSED')} />
                                    <PremiumCheckbox label="Stopped" checked={botStatusFilters.STOPPED} onChange={() => toggleBotStatus('STOPPED')} />
                                </div>
                                <div className="relative">
                                    <select className="bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 py-2 pl-3 pr-8 appearance-none outline-none focus:border-zinc-600" value={botSort} onChange={handleBotSort}>
                                        <option value="DEFAULT">Default Sort</option>
                                        <option value="PNL_DESC">Highest PnL</option>
                                        <option value="PNL_ASC">Lowest PnL</option>
                                    </select>
                                    <ArrowUpDown size={12} className="absolute right-3 top-3 pointer-events-none text-zinc-500" />
                                </div>
                            </div>
                        </div>

                        {isLoadingBots ? (
                            <div className="flex flex-col items-center justify-center py-16 border border-dashed border-zinc-800 rounded bg-zinc-950/50">
                                <Loader2 className="w-8 h-8 text-white animate-spin" />
                                <span className="text-zinc-500 mt-4 text-xs font-mono animate-pulse">Syncing User Strategies...</span>
                            </div>
                        ) : (
                            <>
                                {paginatedBots.map((bot) => (
                                    <div key={bot.id} className="bg-zinc-950 border border-zinc-800 p-4 hover:border-zinc-500 cursor-pointer transition-colors group">
                                        <div className="grid grid-cols-12 items-center gap-4">
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
                                            <div className="col-span-6 md:col-span-2 text-right"><span className="block text-[9px] uppercase text-zinc-600">PnL</span><div className="flex items-center justify-end gap-2"><span className={`font-mono font-bold text-xs ${parseFloat(bot.pnl) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>${bot.pnl}</span><Link href={`/users/${user._id}/bot/${bot.id}`}><ChevronRight size={16} className="text-zinc-700 group-hover:text-white" /></Link></div></div>
                                        </div>
                                    </div>
                                ))}
                                {paginatedBots.length === 0 && (
                                    <div className="text-center py-12 text-zinc-500 text-xs border border-zinc-900 border-dashed">No bots found matching criteria.</div>
                                )}
                            </>
                        )}
                        <Pagination page={botPage} setPage={setBotPage} total={totalBotPages} label="Bots" />
                    </div>
                )}

                {/* --- Billing Tab (Mostly Mock) --- */}
                {tab === 'BILLING' && (
                    <div key="billing" className="space-y-8 animate-enter">
                        <div className="border border-zinc-800 bg-zinc-950 p-8">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-8 flex items-center gap-2">
                                <RefreshCw size={14} /> Subscription Lifecycle
                            </h3>
                            <div className="relative flex flex-col gap-8 pl-4 border-l border-zinc-800">
                                {MOCK_SUB_HISTORY.map((item, i) => {
                                    const Icon = item.icon
                                    return (
                                        <div key={i} className="relative group">
                                            <div className={`absolute -left-6.75 top-1 w-6 h-6 rounded-full bg-black border ${item.border} flex items-center justify-center z-10 shadow-[0_0_10px_rgba(0,0,0,0.5)]`}>
                                                <Icon size={12} className={item.color} />
                                            </div>
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pl-4">
                                                <div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-bold text-white uppercase tracking-wider">{item.event}</span>
                                                        <span className="text-[10px] font-mono text-zinc-600">{item.date}</span>
                                                    </div>
                                                    <div className="text-xs text-zinc-500 mt-1">{item.details}</div>
                                                </div>
                                                <div><Badge variant={item.plan}>{item.plan}</Badge></div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="border border-zinc-800 bg-zinc-950 p-0 flex flex-col">
                            <div className="p-8 pb-4 border-b border-zinc-900">
                                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                        <CreditCard size={14} /> Payment History
                                    </h3>
                                    <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto">
                                        <div className="relative flex-1 lg:w-64">
                                            <Search className="absolute left-3 top-2.5 text-zinc-600" size={14} />
                                            <input
                                                placeholder="Search Invoices..."
                                                className="w-full bg-black border border-zinc-800 py-2 pl-9 text-xs text-white focus:border-white outline-none placeholder-zinc-700"
                                                value={invoiceSearch}
                                                onChange={handleInvoiceSearch}
                                            />
                                        </div>
                                        <div className="flex gap-4 items-center">
                                            <PremiumCheckbox label="Paid" checked={invoiceStatusFilters.PAID} onChange={() => toggleInvoiceStatus('PAID')} />
                                            <PremiumCheckbox label="Failed" checked={invoiceStatusFilters.FAILED} onChange={() => toggleInvoiceStatus('FAILED')} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="overflow-x-auto p-8 pt-4 pb-0 flex-1">
                                <table className="w-full text-left text-sm">
                                    <thead className="text-[10px] text-zinc-600 uppercase border-b border-zinc-900">
                                    <tr>
                                        <th className="pb-3 pl-4 font-normal text-left">Invoice ID</th>
                                        <th className="pb-3 font-normal text-left">Date</th>
                                        <th className="pb-3 font-normal text-left">Amount</th>
                                        <th className="pb-3 font-normal text-center">Status</th>
                                        <th className="pb-3 pr-4 font-normal text-right">Action</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-900">
                                    {paginatedInvoices.map((inv) => (
                                        <tr key={inv.id} className="group hover:bg-zinc-900/30 transition-colors">
                                            <td className="py-4 pl-4 font-mono text-zinc-400">{inv.id}</td>
                                            <td className="py-4 text-zinc-300">{inv.date}</td>
                                            <td className="py-4 font-bold text-white">{inv.amount}</td>
                                            <td className="py-4 text-center">
                                                {inv.status === 'PAID' ? <span className="text-emerald-400 font-medium text-xs">Successful</span> : <span className="text-rose-400 font-medium text-xs">Unsuccessful</span>}
                                            </td>
                                            <td className="py-4 pr-4 text-right">
                                                <button className="text-xs flex items-center gap-1 ml-auto text-zinc-500 hover:text-white transition-colors">
                                                    <InvoiceIcon size={12} /> Invoice
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination page={invoicePage} setPage={setInvoicePage} total={totalInvoicePages} label="History" />
                        </div>
                    </div>
                )}

                {/* --- Action Tab (Mock) --- */}
                {tab === 'ACTION' && (
                    <div key="action" className="space-y-6 animate-enter">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card>
                                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
                                    <Settings size={14} /> Subscription Management
                                </h3>
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-zinc-600 uppercase">Current Plan</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['FREE', 'BASIC', 'ESSENTIAL', 'PRO'].map((plan) => (
                                                <button
                                                    key={plan}
                                                    onClick={() => setSelectedPlan(plan as 'BASIC' | 'ESSENTIAL' | 'PRO')}
                                                    className={`py-3 text-xs font-bold uppercase tracking-wider border rounded-sm transition-all ${selectedPlan === plan ? 'bg-white text-black border-white shadow-sm' : 'bg-black text-zinc-500 border-zinc-800 hover:border-zinc-600 hover:text-zinc-300'}`}
                                                >
                                                    {plan}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-zinc-600 uppercase">Override Monthly Fee ($)</label>
                                        <div className="flex gap-2">
                                            <input
                                                className="flex-1 bg-black border border-zinc-800 p-2 text-xs text-white outline-none focus:border-zinc-600 transition-colors placeholder-zinc-700"
                                                value={customFee}
                                                onChange={(e) => setCustomFee(e.target.value)}
                                            />
                                            <button disabled={selectedPlan === userPlan} className={`text-[10px] font-bold px-4 uppercase border rounded-sm transition-colors ${selectedPlan !== userPlan ? 'bg-white text-black border-white hover:bg-zinc-200 cursor-pointer' : 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed'}`}>Update</button>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            <Card>
                                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
                                    <Shield size={14} /> Account Control
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <button className="border border-zinc-800 p-3 text-xs text-zinc-400 hover:text-white hover:border-zinc-600 flex flex-col items-center gap-2 transition-all"><Key size={16} /> Reset Password</button>
                                    <button className="border border-zinc-800 p-3 text-xs text-zinc-400 hover:text-white hover:border-zinc-600 flex flex-col items-center gap-2 transition-all"><LogOut size={16} /> Force Logout</button>
                                    <button className="border border-amber-900/50 p-3 text-xs text-amber-500 hover:bg-amber-900/10 hover:text-amber-400 flex flex-col items-center gap-2 transition-all bg-transparent"><Flag size={16} /> Flag Account</button>
                                    <button className="border border-rose-900/50 p-3 text-xs text-rose-500 hover:bg-rose-900/10 hover:text-rose-400 flex flex-col items-center gap-2 transition-all bg-transparent"><UserX size={16} /> Ban User</button>
                                </div>
                            </Card>
                        </div>

                        <Card className="flex flex-col p-0">
                            <div className="p-6 pb-0">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
                                    <History size={14} /> Admin Action History
                                </h3>
                            </div>
                            <div className="overflow-x-auto px-6 pb-4">
                                <table className="w-full text-left text-sm">
                                    <thead className="text-[10px] text-zinc-600 uppercase border-b border-zinc-900">
                                    <tr>
                                        <th className="pb-3 font-normal pl-4 text-left">Action ID</th>
                                        <th className="pb-3 font-normal text-left">Action Type</th>
                                        <th className="pb-3 font-normal text-left">Admin</th>
                                        <th className="pb-3 font-normal text-left">Details</th>
                                        <th className="pb-3 font-normal text-right pr-4">Timestamp</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-900">
                                    {paginatedActions.map((act) => (
                                        <tr key={act.id} className="group hover:bg-zinc-900/30 transition-colors">
                                            <td className="py-4 pl-4 font-mono text-zinc-500 text-xs">{act.id}</td>
                                            <td className="py-4 text-left"><span className="text-xs font-bold text-white uppercase tracking-wider">{act.action.replace('_', ' ')}</span></td>
                                            <td className="py-4 text-zinc-300 text-xs text-left">{act.admin}</td>
                                            <td className="py-4 text-zinc-400 text-xs text-left">{act.details}</td>
                                            <td className="py-4 pr-4 text-right font-mono text-zinc-600 text-xs">{act.time}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination page={actionPage} setPage={setActionPage} total={totalActionPages} label="History" />
                        </Card>
                    </div>
                )}
            </div>
        </div>
    )
}
