// components/users/BotDetails.tsx
'use client'

import { useState } from 'react'
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { InteractiveChart } from '@/components/charts/InteractiveChart'
import { MOCK_PNL_DATA, MOCK_EQUITY_DATA } from '@/lib/mock-service'
import {
    ArrowLeft, PlayCircle, PauseCircle, XCircle,
    Settings, Activity, Terminal, Shield, Zap
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from "next/link";

// You would fetch this based on the ID in a real app
interface BotDetailsProps {
    botId: string
    userId: string
}

export default function BotDetailsPage({ botId, userId }: BotDetailsProps) {
    const router = useRouter()
    const [chartType, setChartType] = useState<'PNL' | 'EQUITY'>('PNL')

    // Mock Data for the specific bot
    const botData = {
        id: botId,
        name: 'Alpha Centauri Strategy',
        status: 'RUNNING',
        type: 'TECHNICAL',
        pair: 'BTC/USDT',
        pnl: '+2,450.20',
        roi: '14.2%',
        uptime: '14d 2h',
        config: {
            leverage: '10x',
            mode: 'Hedge',
            takeProfit: '1.5%',
            stopLoss: '0.5%'
        }
    }

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
            <Card className="border-l-4 border-l-emerald-500">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                            <Zap className="text-emerald-500" size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-light text-white uppercase tracking-wider">{botData.name}</h1>
                            <div className="flex items-center gap-3 text-xs font-mono text-zinc-500 mt-1">
                                <span>{botData.id}</span>
                                <span>•</span>
                                <span className="text-white">{botData.pair}</span>
                                <span>•</span>
                                <Badge variant={botData.status}>{botData.status}</Badge>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button className="p-2 hover:bg-zinc-900 rounded text-zinc-500 hover:text-amber-500 transition-colors" title="Pause">
                            <PauseCircle size={20} />
                        </button>
                        <button className="p-2 hover:bg-zinc-900 rounded text-zinc-500 hover:text-emerald-500 transition-colors" title="Resume">
                            <PlayCircle size={20} />
                        </button>
                        <button className="p-2 hover:bg-zinc-900 rounded text-zinc-500 hover:text-rose-500 transition-colors" title="Terminate">
                            <XCircle size={20} />
                        </button>
                    </div>
                </div>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="py-4">
                    <div className="text-[10px] uppercase text-zinc-500 font-bold mb-1">Total PnL</div>
                    <div className="text-xl font-mono text-emerald-400">{botData.pnl}</div>
                </Card>
                <Card className="py-4">
                    <div className="text-[10px] uppercase text-zinc-500 font-bold mb-1">ROI</div>
                    <div className="text-xl font-mono text-white">{botData.roi}</div>
                </Card>
                <Card className="py-4">
                    <div className="text-[10px] uppercase text-zinc-500 font-bold mb-1">Uptime</div>
                    <div className="text-xl font-mono text-zinc-300">{botData.uptime}</div>
                </Card>
                <Card className="py-4">
                    <div className="text-[10px] uppercase text-zinc-500 font-bold mb-1">Leverage</div>
                    <div className="text-xl font-mono text-amber-500">{botData.config.leverage}</div>
                </Card>
            </div>

            {/* Chart Section */}
            <div className="h-80">
                <InteractiveChart
                    data={chartType === 'PNL' ? MOCK_PNL_DATA : MOCK_EQUITY_DATA}
                    type={chartType}
                    setType={setChartType}
                />
            </div>

            {/* Config/Safety Params */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                        <Activity size={14} /> Active Parameters
                    </h3>
                    <div className="space-y-2 text-xs font-mono">
                        <div className="flex justify-between border-b border-zinc-900 pb-2">
                            <span className="text-zinc-500">Trading Mode</span>
                            <span className="text-white">{botData.config.mode}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-900 pb-2">
                            <span className="text-zinc-500">Take Profit</span>
                            <span className="text-emerald-500">{botData.config.takeProfit}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-900 pb-2">
                            <span className="text-zinc-500">Stop Loss</span>
                            <span className="text-rose-500">{botData.config.stopLoss}</span>
                        </div>
                    </div>
                </Card>
                <Card>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                        <Shield size={14} /> Safety Checks
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-zinc-900/50 p-2 border border-zinc-800 rounded flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                            <span className="text-[10px] uppercase text-zinc-400">API Connection</span>
                        </div>
                        <div className="bg-zinc-900/50 p-2 border border-zinc-800 rounded flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                            <span className="text-[10px] uppercase text-zinc-400">Margin Level</span>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    )
}
