'use client'

import React, { useState, useMemo } from 'react'
import { Settings, Shield, Key, LogOut, Flag, UserX, History } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Pagination } from '@/components/common/Pagination'
import { MOCK_ACTION_HISTORY } from '@/lib/data'
import { UserDetails } from "@/types/users";

interface ActionsTabProps {
    user: UserDetails;
}

export const ActionsTab = ({ user }: ActionsTabProps) => {
    const userPlan = user.role === 'admin' ? 'PRO' : user.role === 'broker' ? 'ESSENTIAL' : 'BASIC';
    const [selectedPlan, setSelectedPlan] = useState<'BASIC' | 'ESSENTIAL' | 'PRO' | 'FREE'>('BASIC')
    const [customFee, setCustomFee] = useState('49.00')
    const [actionPage, setActionPage] = useState(1)

    const ACTION_PAGE_SIZE = 5;
    const paginatedActions = useMemo(() => {
        const start = (actionPage - 1) * ACTION_PAGE_SIZE
        return MOCK_ACTION_HISTORY.slice(start, start + ACTION_PAGE_SIZE)
    }, [actionPage])
    const totalActionPages = Math.ceil(MOCK_ACTION_HISTORY.length / ACTION_PAGE_SIZE)

    return (
        <div className="space-y-6 animate-enter">
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
    )
}
