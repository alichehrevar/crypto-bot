// components/risk/RiskControl.tsx
'use client'

import { useState } from 'react'
import { Card } from '@/components/common/Card'
import {
    AlertOctagon,
    Gauge,
    Flag,
    RefreshCcw,
    Lock,
} from 'lucide-react'
import { RiskInvestigation } from './RiskInvestigation'

export interface RiskUser {
    id: string
    name: string
    reason: string
    riskScore: number
    ip: string
    location: string
}

export function RiskControl() {
    const [viewMode, setViewMode] = useState<'DASHBOARD' | 'INVESTIGATE'>('DASHBOARD')
    const [selectedRiskUser, setSelectedRiskUser] = useState<RiskUser | null>(null)
    const [killSwitches, setKillSwitches] = useState({
        BINANCE_SPOT: false,
        BINANCE_FUTURES: false,
        BYBIT_SPOT: false,
        BYBIT_FUTURES: false,
        OKX_SPOT: false,
        OKX_FUTURES: false,
        KRAKEN_SPOT: false,
        KRAKEN_FUTURES: false,
        BINGX_SPOT: false,
        BINGX_FUTURES: false,
        NEW_SIGNUPS: false,
        ACCOUNT_DELETION: false,
    })

    const EXPOSURE_DATA = [
        { asset: 'BTC', long: 65, short: 20, net: 45 },
        { asset: 'ETH', long: 30, short: 35, net: -5 },
        { asset: 'SOL', long: 15, short: 5, net: 10 },
        { asset: 'XRP', long: 5, short: 2, net: 3 },
    ]

    const FLAGGED_ACCOUNTS: RiskUser[] = [
        { id: 'U-1099', name: 'Unknown User', reason: 'Velocity Limit Breached', riskScore: 98, ip: '45.22.19.11', location: 'Cayman Islands' },
        { id: 'U-8821', name: 'James Bond', reason: 'Sanctioned IP Region', riskScore: 95, ip: '192.168.1.5', location: 'North Korea' },
        { id: 'U-3322', name: 'Sarah Connor', reason: 'Duplicate API Key', riskScore: 85, ip: '10.0.0.14', location: 'USA' },
    ]

    const toggleSwitch = (key: keyof typeof killSwitches) => {
        setKillSwitches(prev => ({ ...prev, [key]: !prev[key] }))
    }

    const handleInvestigate = (user: RiskUser) => {
        setSelectedRiskUser(user)
        setViewMode('INVESTIGATE')
    }

    // --- SUB-VIEW: INVESTIGATION MODE ---
    if (viewMode === 'INVESTIGATE' && selectedRiskUser) {
        return <RiskInvestigation user={selectedRiskUser} onBack={() => setViewMode('DASHBOARD')} />
    }

    // --- MAIN VIEW: DASHBOARD ---
    return (
        <div className="space-y-6 animate-enter">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-zinc-800 pb-6">
                <div>
                    <h2 className="text-3xl font-light uppercase tracking-[0.2em] text-white">
                        Risk Control
                    </h2>
                    <p className="text-zinc-500 text-xs font-mono mt-2">GLOBAL EXPOSURE & EMERGENCY CONTROLS</p>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white text-xs font-bold uppercase flex items-center gap-2 transition-colors">
                        <RefreshCcw size={14} /> Recalibrate
                    </button>
                    <button className="px-4 py-2 border border-rose-900 bg-rose-900/10 text-rose-500 hover:bg-rose-900 hover:text-white text-xs font-bold uppercase flex items-center gap-2 transition-colors">
                        <Lock size={14} /> Lockdown Mode
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* LEFT: EMERGENCY BREAKERS */}
                <div className="xl:col-span-1 space-y-6">
                    <Card className="border-rose-900/30 bg-zinc-950/50">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-rose-500 mb-6 flex items-center gap-2">
                            <AlertOctagon size={14} /> Circuit Breakers (Kill Switches)
                        </h3>
                        <div className="space-y-2 overflow-y-auto max-h-100 pr-2 custom-scrollbar">
                            {Object.entries(killSwitches).map(([key, active]) => (
                                <div
                                    key={key}
                                    className="flex items-center justify-between p-2.5 border border-zinc-800 bg-black rounded-sm group hover:border-zinc-700 transition-colors"
                                >
                                    <div>
                                        <div className="text-[10px] font-bold text-zinc-300 group-hover:text-white tracking-wide">
                                            {key.replace(/_/g, ' ')}
                                        </div>
                                        <div className={`text-[9px] font-mono uppercase ${active ? 'text-rose-500' : 'text-zinc-600'}`}>
                                            {active ? 'DISCONNECTED' : 'OPERATIONAL'}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => toggleSwitch(key as keyof typeof killSwitches)}
                                        className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-300 flex items-center ${
                                            active ? 'bg-rose-600 justify-end' : 'bg-zinc-800 justify-start'
                                        }`}
                                    >
                                        <div className="w-3 h-3 bg-white rounded-full shadow-md" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 text-[9px] text-zinc-500 leading-relaxed border-t border-zinc-900 pt-3">
                            <strong className="text-rose-500">WARNING:</strong> Activating a kill switch will immediately sever API connections.
                        </div>
                    </Card>
                </div>

                {/* CENTER: EXPOSURE */}
                <div className="xl:col-span-1 flex flex-col gap-6">
                    <Card className="flex-1">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
                            <Gauge size={14} /> Global Net Exposure
                        </h3>
                        <div className="space-y-6">
                            {EXPOSURE_DATA.map((item) => (
                                <div key={item.asset}>
                                    <div className="flex justify-between text-xs mb-2">
                                        <span className="font-bold text-white">{item.asset}</span>
                                        <span className="font-mono text-zinc-400">
                      Net: {item.net > 0 ? '+' : ''}
                                            {item.net}%
                    </span>
                                    </div>
                                    <div className="flex h-3 w-full rounded-sm overflow-hidden bg-zinc-900 relative">
                                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white z-10 opacity-20" />
                                        <div className="w-1/2 flex justify-end">
                                            <div className="bg-emerald-500 h-full" style={{ width: `${item.long}%` }} />
                                        </div>
                                        <div className="w-1/2 flex justify-start">
                                            <div className="bg-rose-500 h-full" style={{ width: `${item.short}%` }} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 p-4 bg-zinc-900/50 border border-zinc-900 rounded text-center">
                            <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Total Platform VaR</div>
                            <div className="text-2xl font-mono text-white">$1,204,592</div>
                            <div className="text-[10px] text-emerald-500 mt-1">Within Safety Limits (&lt;$2M)</div>
                        </div>
                    </Card>
                </div>

                {/* RIGHT: FLAGGED ACCOUNTS */}
                <div className="xl:col-span-1">
                    <Card className="h-full flex flex-col">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
                            <Flag size={14} /> Flagged Accounts Queue
                        </h3>
                        <div className="flex-1 overflow-y-auto custom-scrollbar -mx-2 px-2 space-y-3">
                            {FLAGGED_ACCOUNTS.map((user) => (
                                <div
                                    key={user.id}
                                    className="p-3 bg-zinc-900 border border-zinc-800 rounded-sm hover:border-zinc-600 transition-colors group"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="text-xs font-bold text-white">{user.name}</div>
                                            <div className="text-[10px] font-mono text-zinc-500">{user.id}</div>
                                        </div>
                                        <div
                                            className={`px-1.5 py-0.5 text-[9px] font-bold border rounded ${
                                                user.riskScore > 90
                                                    ? 'text-rose-500 border-rose-900 bg-rose-900/10'
                                                    : 'text-amber-500 border-amber-900 bg-amber-900/10'
                                            }`}
                                        >
                                            SCORE: {user.riskScore}
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-zinc-400 mb-3">{user.reason}</div>
                                    <button
                                        onClick={() => handleInvestigate(user)}
                                        className="w-full py-1.5 bg-zinc-950 border border-zinc-800 text-[10px] font-bold uppercase text-zinc-300 hover:text-white hover:bg-zinc-900 hover:border-zinc-600 transition-colors"
                                    >
                                        Investigate
                                    </button>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    )
}
