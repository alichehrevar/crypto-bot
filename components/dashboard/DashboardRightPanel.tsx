// components/dashboard/DashboardRightPanel.tsx
'use client'

import { Card } from '@/components/common/Card'
import { Doughnut } from 'react-chartjs-2'
import { Database, Server, ShieldAlert, AlertTriangle } from 'lucide-react'
import { useMemo } from 'react'
import Link from 'next/link'
import { ChartData, ChartOptions } from 'chart.js'

// 1. Asset Allocation Data
const ASSET_ALLOCATION = [
    { name: 'USDT', value: 45, color: '#ffffff' },
    { name: 'BTC', value: 30, color: '#52525b' },
    { name: 'ETH', value: 15, color: '#27272a' },
    { name: 'SOL', value: 10, color: '#18181b' },
]

export function DashboardRightPanel() {

    const allocationData: ChartData<'doughnut'> = useMemo(() => ({
        labels: ASSET_ALLOCATION.map(a => a.name),
        datasets: [{
            data: ASSET_ALLOCATION.map(a => a.value),
            backgroundColor: ASSET_ALLOCATION.map(a => a.color),
            borderWidth: 0,
            hoverOffset: 4
        }]
    }), [])

    const allocationOptions: ChartOptions<'doughnut'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#09090b',
                titleColor: '#fff',
                bodyColor: '#fff',
                borderColor: '#27272a',
                borderWidth: 1
            }
        },
        cutout: '70%'
    }

    // 2. System Health Data
    const SYSTEM_HEALTH = [
        { name: 'Database (Postgres)', status: 'ONLINE', latency: '14ms', load: '12%' },
        { name: 'Binance API Gateway', status: 'ONLINE', latency: '45ms', load: '32%' },
        { name: 'Bybit API Gateway', status: 'DEGRADED', latency: '210ms', load: '89%' },
        { name: 'AI Inference Engine', status: 'ONLINE', latency: '800ms', load: '65%' },
    ]

    // 3. Alerts Data
    const RISK_ALERTS = [
        { id: 'U-1024', user: 'Sarah Connor', issue: 'Max Drawdown Hit (-15%)', time: '14:02' },
        { id: 'U-8821', user: 'James Bond', issue: 'High Frequency Error (429)', time: '13:55' },
        { id: 'U-9210', user: 'Jason Bourne', issue: 'Unusual Login Activity', time: '13:12' },
        { id: 'U-3321', user: 'Ellen Ripley', issue: 'API Key Expired', time: '12:45' },
    ]

    return (
        <>
            {/* Asset Allocation Card */}
            <Card className="h-auto md:h-80 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                        <Database size={14}/> Asset Allocation
                    </h3>
                    <div className="text-[10px] text-zinc-500 font-mono">Total: $14.2M</div>
                </div>

                <div className="flex-1 relative flex flex-col">
                    <div className="h-40 relative z-10 w-full">
                        <Doughnut data={allocationData} options={allocationOptions} />
                        <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                            <span className="text-xl font-bold text-white">45%</span>
                            <span className="text-[9px] uppercase text-zinc-500 font-bold">USDT</span>
                        </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-zinc-900 grid grid-cols-2 gap-2">
                        {ASSET_ALLOCATION.map((item) => (
                            <div key={item.name} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: item.color }}></div>
                                    <span className="text-zinc-300 font-medium">{item.name}</span>
                                </div>
                                <span className="font-mono text-zinc-500">{item.value}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </Card>

            {/* Infrastructure Status */}
            <Card className="flex flex-col h-80">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
                    <Server size={14}/> Infrastructure Status
                </h3>
                <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
                    {SYSTEM_HEALTH.map((sys, i) => (
                        <div key={i} className="flex items-center justify-between text-xs border-b border-zinc-900 pb-2 last:border-0 last:pb-0">
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${sys.status === 'ONLINE' ? 'bg-emerald-500 shadow-[0_0_5px_#10b981]' : 'bg-amber-500 animate-pulse'}`} />
                                <span className="text-zinc-300 font-medium">{sys.name}</span>
                            </div>
                            <div className="flex gap-4 font-mono text-zinc-500">
                                <span>{sys.latency}</span>
                                <span className={parseInt(sys.load) > 80 ? 'text-rose-500 font-bold' : 'text-zinc-500'}>{sys.load}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Critical Alerts */}
            <Card className="flex flex-col h-80">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
                    <ShieldAlert size={14}/> Critical Alerts
                </h3>
                <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-2">
                    {RISK_ALERTS.map((alert, i) => (
                        <Link
                            key={i}
                            href={`/users/${alert.id}`}
                            className="flex items-start gap-3 p-3 bg-rose-900/10 border border-rose-900/20 rounded-sm hover:bg-rose-900/20 transition-colors cursor-pointer group"
                        >
                            <AlertTriangle size={16} className="text-rose-500 mt-0.5" />
                            <div className="flex-1">
                                <div className="text-xs font-bold text-rose-400 group-hover:underline">{alert.issue}</div>
                                <div className="text-[10px] text-zinc-500 mt-1 flex justify-between">
                                    <span>{alert.user}</span>
                                    <span className="font-mono">{alert.time}</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </Card>
        </>
    )
}
