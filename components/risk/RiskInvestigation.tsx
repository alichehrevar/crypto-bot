// components/risk/RiskInvestigation.tsx
'use client'

import { useMemo } from 'react'
import { RiskUser } from '@/components/risk/RiskControl'
import { Card } from '@/components/common/Card'
import { ArrowLeft, Microscope } from 'lucide-react'

interface RiskInvestigationProps {
    user: RiskUser
    onBack: () => void
}

export function RiskInvestigation({ user, onBack }: RiskInvestigationProps) {

    const caseId = useMemo(() => {
        let hash = 0;
        for (let i = 0; i < user.id.length; i++) {
            hash = user.id.charCodeAt(i) + ((hash << 5) - hash);
        }
        return Math.abs(hash % 10000).toString().padStart(4, '0');
    }, [user.id]);

    return (
        <div className="animate-enter space-y-6">
            <button
                onClick={onBack}
                className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 uppercase tracking-widest transition-colors"
            >
                <ArrowLeft size={14} /> Return to Risk Overview
            </button>

            <div className="flex justify-between items-center border-b border-zinc-800 pb-6">
                <div>
                    <h2 className="text-3xl font-light text-white uppercase flex items-center gap-3">
                        <Microscope size={32} className="text-rose-500" /> Forensic Investigation
                    </h2>
                    <div className="flex gap-4 mt-2 text-xs font-mono text-zinc-500">
                        <span>CASE-ID: {caseId}</span>
                        <span>
                            TARGET: {user.name} ({user.id})
                        </span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold uppercase transition-colors">
                        Clear Flag
                    </button>
                    <button className="px-4 py-2 bg-rose-900/20 border border-rose-900 text-rose-500 hover:bg-rose-900 hover:text-white text-xs font-bold uppercase transition-colors">
                        Freeze Assets
                    </button>
                    <button className="px-4 py-2 bg-black border border-zinc-700 text-white hover:bg-zinc-900 text-xs font-bold uppercase transition-colors">
                        Ban User
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="h-full">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-6">Risk Profile</h3>
                    <div className="flex flex-col items-center mb-6">
                        <div className="w-24 h-24 rounded-full border-4 border-zinc-900 flex items-center justify-center relative">
                            <span className="text-3xl font-mono font-bold text-rose-500">{user.riskScore}</span>
                            <div className="absolute inset-0 border-4 border-rose-500 rounded-full opacity-25 animate-pulse" />
                        </div>
                        <span className="mt-2 text-[10px] uppercase font-bold text-rose-500">Critical Risk Level</span>
                    </div>
                    <div className="space-y-3 text-xs">
                        <div className="flex justify-between border-b border-zinc-900 pb-2">
                            <span className="text-zinc-500">Primary Trigger</span>
                            <span className="text-white">{user.reason}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-900 pb-2">
                            <span className="text-zinc-500">IP Address</span>
                            <span className="font-mono text-zinc-300">{user.ip}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-900 pb-2">
                            <span className="text-zinc-500">Geo Location</span>
                            <span className="text-white">{user.location}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-900 pb-2">
                            <span className="text-zinc-500">Device Fingerprint</span>
                            <span className="font-mono text-zinc-500">A8F9-22B1</span>
                        </div>
                    </div>
                </Card>

                <Card className="lg:col-span-2">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-6">Suspicious Activity Log</h3>
                    <div className="space-y-2 max-h-75 overflow-y-auto custom-scrollbar pr-2">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="grid grid-cols-12 gap-2 text-xs border-b border-zinc-900/50 pb-2">
                                <span className="col-span-2 font-mono text-zinc-500">14:02:{10 + i}</span>
                                <span className="col-span-2 font-bold text-white">API_REQ</span>
                                <span className="col-span-8 text-zinc-400">
                  Rapid fire order placement (Binance Futures) - Rate limit exceeded (429)
                </span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-zinc-900">
                        <h4 className="text-[10px] uppercase font-bold text-zinc-500 mb-2">Admin Notes</h4>
                        <textarea
                            className="w-full bg-black border border-zinc-800 p-3 text-xs text-white outline-none focus:border-zinc-600 h-20 resize-none"
                            placeholder="Add investigation notes..."
                        />
                    </div>
                </Card>
            </div>
        </div>
    )
}
