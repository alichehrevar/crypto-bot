// components/users/BotLogs.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/common/Card'
import { HISTORICAL_LOG_MSGS } from '@/lib/mock-service'
import {
    ArrowLeft,
    Search,
    Download,
    Terminal,
    PauseCircle,
    PlayCircle,
    CheckCircle,
    Clock
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface BotLogsProps {
    botId: string
    userId: string
}

interface LogEntry {
    id: number
    time: string
    msg: string
    type: 'INFO' | 'WARN' | 'SUCCESS'
}

export default function BotLogs({ botId, userId }: BotLogsProps) {
    const router = useRouter()
    const [searchTerm, setSearchTerm] = useState('')
    const [isLive, setIsLive] = useState(true)
    const scrollRef = useRef<HTMLDivElement>(null)

    // FIX: Generate initial state lazily inside useState.
    // This runs exactly once on mount and avoids the useEffect state update error.
    const [logs, setLogs] = useState<LogEntry[]>(() => {
        return Array.from({ length: 50 }).map((_, i) => {
            const msg = HISTORICAL_LOG_MSGS[i % HISTORICAL_LOG_MSGS.length]
            const type = msg.includes('check') ? 'INFO' : msg.includes('healthy') ? 'SUCCESS' : 'WARN'

            // Generate timestamps going back in time
            const date = new Date()
            date.setSeconds(date.getSeconds() - (50 - i) * 5)

            return {
                id: i,
                time: date.toISOString().replace('T', ' ').substring(0, 19),
                msg,
                type: type as 'INFO' | 'WARN' | 'SUCCESS'
            }
        })
    })

    // FIX: Effect only handles the LIVE updates now
    useEffect(() => {
        if (!isLive) return

        const interval = setInterval(() => {
            const randomMsg = HISTORICAL_LOG_MSGS[Math.floor(Math.random() * HISTORICAL_LOG_MSGS.length)]
            const type = randomMsg.includes('check') ? 'INFO' : randomMsg.includes('healthy') ? 'SUCCESS' : 'WARN'

            setLogs(prev => {
                const newLog: LogEntry = {
                    id: Date.now(),
                    time: new Date().toISOString().replace('T', ' ').substring(0, 19),
                    msg: randomMsg,
                    type: type as 'INFO' | 'WARN' | 'SUCCESS'
                }
                const updated = [...prev, newLog]
                if (updated.length > 200) updated.shift() // Keep memory clean
                return updated
            })

            // Auto scroll to bottom
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight
            }

        }, 1500)

        return () => clearInterval(interval)
    }, [isLive])

    const filteredLogs = logs.filter(l =>
        l.msg.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="animate-enter space-y-6 h-[calc(100vh-140px)] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <button
                    onClick={() => router.back()}
                    className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 uppercase tracking-widest transition-colors"
                >
                    <ArrowLeft size={14} /> Back to Bot Config
                </button>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full">
                        <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
                        <span className="text-[10px] font-bold uppercase text-zinc-400">
                            {isLive ? 'Live Connection' : 'Paused'}
                        </span>
                    </div>
                    <button
                        onClick={() => setIsLive(!isLive)}
                        className="text-zinc-500 hover:text-white transition-colors"
                    >
                        {isLive ? <PauseCircle size={18} /> : <PlayCircle size={18} />}
                    </button>
                </div>
            </div>

            <Card className="flex-1 flex flex-col p-0 border border-zinc-800 bg-black overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 border-b border-zinc-900 bg-zinc-950 flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Terminal size={16} className="text-zinc-500" />
                        <h1 className="text-sm font-bold text-white uppercase tracking-wider">Execution Logs</h1>
                        <span className="px-2 py-0.5 bg-zinc-900 text-[10px] text-zinc-500 rounded border border-zinc-800 font-mono">
                            {botId}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-2.5 text-zinc-600" size={14} />
                            <input
                                placeholder="Search logs (Regex supported)..."
                                className="w-full bg-black border border-zinc-800 py-2 pl-9 text-xs text-white focus:border-white outline-none font-mono placeholder:text-zinc-700"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button className="px-4 py-2 bg-white text-black hover:bg-zinc-200 text-xs font-bold uppercase flex items-center gap-2 transition-colors">
                            <Download size={14} /> Export
                        </button>
                    </div>
                </div>

                {/* Log Terminal */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1 font-mono text-[11px]"
                >
                    {filteredLogs.map((log) => (
                        <div key={log.id} className="grid grid-cols-12 gap-2 hover:bg-zinc-900/50 p-0.5 rounded transition-colors group">
                            <div className="col-span-2 md:col-span-2 text-zinc-600 select-none">
                                {log.time}
                            </div>
                            <div className="col-span-1 text-center select-none">
                                {log.type === 'INFO' && <span className="text-blue-500">INFO</span>}
                                {log.type === 'WARN' && <span className="text-amber-500">WARN</span>}
                                {log.type === 'SUCCESS' && <span className="text-emerald-500">OK</span>}
                            </div>
                            <div className="col-span-9 md:col-span-9 text-zinc-300 group-hover:text-white break-words flex gap-2">
                                <span className="text-zinc-700 select-none">|</span>
                                {log.msg}
                            </div>
                        </div>
                    ))}
                    {filteredLogs.length === 0 && (
                        <div className="text-center py-20 text-zinc-600 italic">
                            No logs found matching filter.
                        </div>
                    )}
                    {/* Anchor for auto-scroll */}
                    <div className="h-4" />
                </div>

                {/* Footer */}
                <div className="p-2 bg-zinc-950 border-t border-zinc-900 flex justify-between items-center text-[10px] text-zinc-600 font-mono select-none">
                    <div className="flex gap-4">
                        <span>Buffer: {logs.length}/1000</span>
                        <span>Encoding: UTF-8</span>
                    </div>
                    <div className="flex gap-4">
                        <span className="flex items-center gap-1"><CheckCircle size={10} className="text-emerald-500"/> System Healthy</span>
                        <span className="flex items-center gap-1"><Clock size={10} /> Latency: 4ms</span>
                    </div>
                </div>
            </Card>
        </div>
    )
}
