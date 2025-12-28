// components/dashboard/DashboardOverview.tsx
'use client'

import { useMemo } from 'react'
import { Card } from '@/components/common/Card'
import { SystemPerformanceChart } from '@/components/charts/SystemPerformanceChart'
import { GlobalTradeStream } from './GlobalTradeStream'
import { DashboardRightPanel } from './DashboardRightPanel'
import {Globe, CreditCard, Zap, Activity, TrendingUp, LucideIcon} from 'lucide-react'

// Map string keys to Lucide components
const ICON_MAP: Record<string, LucideIcon> = {
    Globe,
    CreditCard,
    Zap,
    Activity
}

const GLOBAL_STATS = [
    { label: 'Total AUM', value: '$14.2M', sub: '+4.2% this week', trend: 'UP', icon: 'Globe' },
    { label: 'Monthly Revenue', value: '$128,450', sub: '$92 ARPPU', trend: 'UP', icon: 'CreditCard' },
    { label: 'Active Bots', value: '3,402', sub: '124 Deployments', trend: 'UP', icon: 'Zap' },
    { label: 'Platform Volume', value: '$42.5M', sub: '24h Total', trend: 'DOWN', icon: 'Activity' },
]

export function DashboardOverview() {

    const LIVE_TICKER = useMemo(() => {
        const baseData = [
            { pair: 'BTC/USDT', price: 67842.50, change: 2.45, vol: '42.5K' },
            { pair: 'ETH/USDT', price: 3450.12, change: -1.20, vol: '128K' },
            { pair: 'DOGE/USDT', price: 0.1425, change: 8.50, vol: '890M' },
            { pair: 'XRP/USDT', price: 0.6210, change: -0.45, vol: '45M' },
            { pair: 'SOL/USDT', price: 148.90, change: 5.75, vol: '1.2M' },
        ]
        return [...baseData, ...baseData, ...baseData].map((item, i) => ({...item, id: i}))
    }, [])

    return (
        <div className="space-y-6 animate-enter">
            {/* Header & Ticker */}
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-end">
                    <div>
                        <h2 className="text-3xl font-light uppercase tracking-[0.2em] text-white">Command Center</h2>
                        <p className="text-zinc-500 text-xs font-mono mt-2">SYSTEM WIDE TELEMETRY & FINANCIALS</p>
                    </div>
                    <div className="px-4 py-2 border border-zinc-800 bg-zinc-950 flex flex-col items-end">
                        <span className="text-[9px] uppercase text-zinc-600 font-bold">Server Time</span>
                        <span
                            className="text-xs font-mono text-zinc-300"
                            suppressHydrationWarning
                        >
                           {new Date().toISOString().split('T')[1].split('.')[0]} UTC
                       </span>
                    </div>
                </div>

                <div className="ticker-wrap border-t border-b border-zinc-800">
                    <div className="ticker">
                        {LIVE_TICKER.map((t) => (
                            <div key={t.id} className="ticker-item">
                                <span className="font-bold text-zinc-300">{t.pair}</span>
                                <span className="text-zinc-600 mx-2">@</span>
                                <span className="font-mono text-white">${t.price.toLocaleString()}</span>
                                <span className="text-zinc-700 mx-2">|</span>
                                <span className={`font-mono font-bold ${t.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                   {t.change > 0 ? '+' : ''}{t.change.toFixed(2)}%
                                </span>
                                <span className="text-zinc-700 mx-2">|</span>
                                <span className="text-zinc-500">Vol: {t.vol}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {GLOBAL_STATS.map((stat, i) => {
                    const Icon = ICON_MAP[stat.icon]
                    return (
                        <Card key={i} className="relative overflow-hidden group hover:border-zinc-600 transition-colors h-32 flex flex-col justify-center">
                            <div className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest mb-1">
                                {stat.label}
                            </div>
                            <div className="text-2xl font-mono text-white font-medium">{stat.value}</div>
                            <div className={`text-xs mt-2 font-mono flex items-center gap-1 ${stat.trend === 'UP' ? 'text-emerald-500' : 'text-zinc-500'}`}>
                                <TrendingUp size={12}/> {stat.sub}
                            </div>
                            {/* Render Background Icon */}
                            <div className="absolute -right-6 -bottom-6 opacity-5 transform group-hover:scale-110 transition-transform">
                                {Icon && <Icon size={100} />}
                            </div>
                        </Card>
                    )
                })}
            </div>

            {/* Main Content Area - FIXED LAYOUT */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 flex flex-col gap-6">
                    <SystemPerformanceChart />
                    <GlobalTradeStream />
                </div>

                {/* Sidebar Component */}
                <div className="xl:col-span-1 flex flex-col gap-6">
                    <DashboardRightPanel />
                </div>
            </div>
        </div>
    )
}
