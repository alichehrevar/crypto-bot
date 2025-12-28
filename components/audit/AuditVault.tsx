// components/audit/AuditVault.tsx
'use client'

import { useState, useMemo } from 'react'
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { Bar } from 'react-chartjs-2'
import { ChartOptions } from 'chart.js'
import '@/lib/chart-config'
import {
    FileJson,
    Download,
    Search,
    X,
    CheckCircle,
    XCircle,
} from 'lucide-react'

interface AuditLog {
    id: string
    admin: string
    action: string
    target: string
    ip: string
    timestamp: string
    status: 'SUCCESS' | 'FAILED'
    severity: 'INFO' | 'WARN' | 'CRITICAL'
    payload: Record<string, string | number | boolean | null>
    hash: string
}

export function AuditVault() {
    const [auditSearch, setAuditSearch] = useState('')
    const [detailLog, setDetailLog] = useState<AuditLog | null>(null)

    // Deterministic Data Generation (No useEffect needed)
    const AUDIT_LOGS = useMemo(() => {
        const baseDate = new Date('2024-10-25T12:00:00Z').getTime()

        return Array.from({ length: 20 }).map((_, i) => {
            const seed = (i + 1) * 123.45
            const pseudoRand = (offset: number) => {
                const x = Math.sin(seed + offset) * 10000
                return x - Math.floor(x)
            }

            return {
                id: `LOG-${84920 - i}`,
                admin: ['Kaveh', 'System_Auto', 'Support_Team', 'Admin_2'][i % 4],
                action: ['FORCE_LOGOUT', 'UPDATE_FEE', 'KILL_SWITCH_TEST', 'USER_REFUND', 'CONFIG_CHANGE'][i % 5],
                target: `User-${1000 + i}`,
                ip: `192.168.1.${i}`,
                timestamp: new Date(baseDate - i * 3600000).toISOString(),
                status: ['SUCCESS', 'SUCCESS', 'SUCCESS', 'FAILED'][i % 4] as 'SUCCESS' | 'FAILED',
                severity: ['INFO', 'WARN', 'CRITICAL', 'INFO'][i % 4] as 'INFO' | 'WARN' | 'CRITICAL',
                payload: { fee_old: '0.1%', fee_new: '0.05%', reason: 'Holiday promo', auth_hash: 'a8f92...' },
                hash: `sha256:${Math.floor(pseudoRand(1) * 10000000).toString(16)}...`,
            }
        })
    }, [])

    const filteredLogs = useMemo(() => {
        return AUDIT_LOGS.filter(
            (log) => log.id.includes(auditSearch) || log.target.includes(auditSearch) || log.admin.includes(auditSearch),
        )
    }, [AUDIT_LOGS, auditSearch])

    // Activity Chart Data
    const chartData = {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
            {
                label: 'Admin Actions',
                data: [12, 19, 3, 5, 2, 3, 15],
                backgroundColor: '#ffffff',
                borderRadius: 2,
            },
        ],
    }

    const chartOptions: ChartOptions<'bar'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { display: false }, y: { display: false } },
    }

    const getStatusIcon = (status: string) => {
        if (status === 'SUCCESS') {
            return <CheckCircle size={12} className="text-emerald-500" />
        }
        return <XCircle size={12} className="text-rose-500" />
    }

    return (
        <div className="space-y-6 animate-enter relative">
            <div className="flex justify-between items-end border-b border-zinc-800 pb-6">
                <div>
                    <h2 className="text-3xl font-light uppercase tracking-[0.2em] text-white">Audit Vault</h2>
                    <p className="text-zinc-500 text-xs font-mono mt-2">IMMUTABLE SYSTEM LEDGER & COMPLIANCE LOGS</p>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 border border-zinc-800 text-zinc-400 text-xs font-bold uppercase flex items-center gap-2 hover:text-white hover:bg-zinc-900 transition-colors">
                        <FileJson size={14} /> Verify Hash
                    </button>
                    <button className="px-4 py-2 bg-white text-black text-xs font-bold uppercase flex items-center gap-2 hover:bg-zinc-200 transition-colors">
                        <Download size={14} /> Export CSV
                    </button>
                </div>
            </div>

            {/* ANALYTICS BAR */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-sm">
                    <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Total Events (24h)</div>
                    <div className="text-xl font-mono text-white">1,402</div>
                </div>
                <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-sm">
                    <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Critical Actions</div>
                    <div className="text-xl font-mono text-rose-500">12</div>
                </div>
                <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-sm">
                    <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Most Active Admin</div>
                    <div className="text-xl font-mono text-white">Kaveh</div>
                </div>
                <div className="p-4 border border-zinc-800 bg-zinc-900 rounded-sm relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20">
                        <Bar data={chartData} options={chartOptions} />
                    </div>
                    <div className="relative z-10">
                        <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Activity Trend</div>
                        <div className="text-xl font-mono text-emerald-500">+12%</div>
                    </div>
                </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 p-4 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-2.5 text-zinc-600" size={14} />
                    <input
                        value={auditSearch}
                        onChange={(e) => setAuditSearch(e.target.value)}
                        placeholder="Search by Admin, Action, Target ID or IP..."
                        className="w-full bg-black border border-zinc-800 pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-white transition-colors font-mono"
                    />
                </div>
                <div className="flex gap-2">
                    <select className="bg-black border border-zinc-800 text-xs text-white p-2 outline-none">
                        <option>All Severity</option>
                        <option>Critical</option>
                        <option>Warning</option>
                        <option>Info</option>
                    </select>
                    <select className="bg-black border border-zinc-800 text-xs text-white p-2 outline-none">
                        <option>All Sources</option>
                        <option>System</option>
                        <option>Admin</option>
                    </select>
                </div>
            </div>

            <div className="flex gap-6">
                <Card className={`p-0 overflow-hidden transition-all duration-300 ${detailLog ? 'w-2/3' : 'w-full'}`}>
                    <div className="overflow-x-auto h-150 custom-scrollbar">
                        <table className="w-full text-left text-xs">
                            <thead className="text-[10px] text-zinc-500 uppercase font-bold bg-zinc-950 border-b border-zinc-900 sticky top-0">
                            <tr>
                                <th className="p-4 pl-6">Log ID</th>
                                <th className="p-4">Timestamp</th>
                                <th className="p-4">Severity</th>
                                <th className="p-4">Action</th>
                                <th className="p-4">Admin</th>
                                <th className="p-4 text-right pr-6">Status</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-900">
                            {filteredLogs.map((log) => (
                                <tr
                                    key={log.id}
                                    onClick={() => setDetailLog(log)}
                                    className={`cursor-pointer transition-colors font-mono ${detailLog?.id === log.id ? 'bg-zinc-900' : 'hover:bg-zinc-900/30'
                                    }`}
                                >
                                    <td className="p-4 pl-6 text-zinc-500">{log.id}</td>
                                    <td className="p-4 text-zinc-300">{new Date(log.timestamp).toLocaleString()}</td>
                                    <td className="p-4">
                                        <Badge
                                            variant={
                                                log.severity === 'CRITICAL'
                                                    ? 'ERROR'
                                                    : log.severity === 'WARN'
                                                        ? 'SUSPENDED'
                                                        : 'BASIC'
                                            }
                                        >
                                            {log.severity}
                                        </Badge>
                                    </td>
                                    <td className="p-4 text-white font-bold">{log.action}</td>
                                    <td className="p-4 text-zinc-400">{log.admin}</td>
                                    <td className="p-4 text-right pr-6">
                                        <div className="flex items-center justify-end gap-2">
                                            {getStatusIcon(log.status)}
                                            <span className={log.status === 'SUCCESS' ? 'text-emerald-500' : 'text-rose-500 font-bold'}>
                                                {log.status}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {detailLog && (
                    <Card className="w-1/3 h-150 flex flex-col border-l-4 border-l-white animate-enter">
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Log Inspector</h3>
                            <button onClick={() => setDetailLog(null)} className="text-zinc-500 hover:text-white">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-zinc-600 uppercase">Event ID</label>
                                <div className="text-sm text-white font-mono bg-zinc-900 p-2 border border-zinc-800">{detailLog.id}</div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-zinc-600 uppercase">Cryptographic Hash</label>
                                <div className="text-[10px] text-zinc-400 font-mono break-all bg-zinc-900 p-2 border border-zinc-800">
                                    {detailLog.hash}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-zinc-600 uppercase">Actor</label>
                                    <div className="text-xs text-white">{detailLog.admin}</div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-zinc-600 uppercase">IP Address</label>
                                    <div className="text-xs text-white font-mono">{detailLog.ip}</div>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-zinc-600 uppercase">Change Payload (JSON)</label>
                                <pre className="text-[10px] text-emerald-500 font-mono bg-black p-3 border border-zinc-800 overflow-x-auto rounded">
                                    {JSON.stringify(detailLog.payload, null, 2)}
                                </pre>
                            </div>
                        </div>
                        <div className="mt-auto pt-4 border-t border-zinc-900">
                            <button className="w-full py-2 bg-zinc-900 border border-zinc-800 text-xs font-bold uppercase text-white hover:bg-zinc-800">
                                Download Certificate
                            </button>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    )
}
