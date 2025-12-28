'use client'

import { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/common/Card'
import { getData } from "@/actions/get"
import {
    ArrowLeft,
    Search,
    Download,
    Terminal,
    PauseCircle,
    PlayCircle,
    CheckCircle,
    AlertTriangle,
    Info,
    XCircle,
    RefreshCw,
    Loader2,
    ArrowDown // Import ArrowDown for the jump button
} from 'lucide-react'
import { useRouter } from 'next/navigation'

// --- Types ---
type LogMetaValue = string | number | boolean | null | undefined;

interface LogMeta {
    botId: string;
    botName?: string;
    reason?: string;
    price?: number;
    signal?: string;
    indicator?: string;
    finalSignal?: string;
    method?: string;
    [key: string]: LogMetaValue;
}

interface BotLogEntry {
    _id: string;
    timestamp: string;
    level: string;
    message: string;
    meta?: LogMeta;
}

interface LogApiResponse {
    success: boolean;
    botName: string;
    logs: BotLogEntry[];
}

interface BotLogsProps {
    botId: string;
    userId: string;
}

export default function BotLogs({ botId, userId }: BotLogsProps) {
    const router = useRouter()
    const scrollRef = useRef<HTMLDivElement>(null)

    // State
    const [logs, setLogs] = useState<BotLogEntry[]>([])
    const [botName, setBotName] = useState<string>('Loading...')
    const [loading, setLoading] = useState<boolean>(true)
    const [isLive, setIsLive] = useState<boolean>(true)
    const [searchTerm, setSearchTerm] = useState<string>('')
    const [error, setError] = useState<boolean>(false)
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

    // Scroll State
    const [shouldAutoScroll, setShouldAutoScroll] = useState<boolean>(true);

    // Fetch Function
    const fetchLogs = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const response: LogApiResponse = await getData(`/bots/${botId}/logs?limit=200`);

            if (response && response.success) {
                setBotName(response.botName || 'Unknown Bot');
                const sortedLogs = [...response.logs].reverse();
                setLogs(sortedLogs);
                setLastUpdated(new Date());
                setError(false);
            } else {
                setError(true);
            }
        } catch (err) {
            console.error("Failed to fetch logs", err);
            setError(true);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    // Initial Load
    useEffect(() => {
        fetchLogs();
        // Force scroll to bottom on initial mount regardless of logic
        setTimeout(() => scrollToBottom(), 100);
    }, [botId]);

    // Polling Effect
    useEffect(() => {
        let intervalId: NodeJS.Timeout;
        if (isLive) {
            intervalId = setInterval(() => {
                fetchLogs(true);
            }, 3000);
        }
        return () => clearInterval(intervalId);
    }, [isLive, botId]);

    // --- SCROLL LOGIC ---

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            setShouldAutoScroll(true); // Re-engage auto-scroll
        }
    };

    // Handle Scroll Event to detect if user is at bottom
    const handleScroll = () => {
        if (!scrollRef.current) return;

        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        // Check if we are within 50px of the bottom
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

        setShouldAutoScroll(isAtBottom);
    };

    // Auto-scroll Effect (Only runs if shouldAutoScroll is true)
    useEffect(() => {
        if (isLive && shouldAutoScroll && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs, isLive, shouldAutoScroll]);

    // --- FILTERS ---
    const filteredLogs = logs.filter(l => {
        const searchLower = searchTerm.toLowerCase();
        const metaIncludes = (meta: LogMeta | undefined, term: string) => {
            if (!meta) return false;
            if (meta.reason && typeof meta.reason === 'string' && meta.reason.toLowerCase().includes(term)) return true;
            return false;
        };
        return (
            l.message.toLowerCase().includes(searchLower) ||
            l.level.toLowerCase().includes(searchLower) ||
            metaIncludes(l.meta, searchLower)
        );
    });

    // Helper for Level Color/Icon
    const getLevelDetails = (level: string) => {
        switch (level.toLowerCase()) {
            case 'error': return { color: 'text-red-500', icon: <XCircle size={12} />, label: 'ERR' };
            case 'warn': return { color: 'text-amber-500', icon: <AlertTriangle size={12} />, label: 'WARN' };
            case 'info': default: return { color: 'text-blue-400', icon: <Info size={12} />, label: 'INFO' };
        }
    };

    const handleExport = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
        const anchor = document.createElement('a');
        anchor.href = dataStr;
        anchor.download = `bot-${botId}-logs.json`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
    };

    return (
        <div className="animate-enter space-y-4 h-[calc(100vh-140px)] flex flex-col relative">

            {/* Header Area */}
            <div className="flex items-center justify-between shrink-0">
                <button
                    onClick={() => router.back()}
                    className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 uppercase tracking-widest transition-colors"
                >
                    <ArrowLeft size={14} /> Back to Bot Config
                </button>

                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 px-3 py-1.5 border rounded-full transition-colors ${isLive ? 'bg-zinc-900 border-zinc-800' : 'bg-amber-900/20 border-amber-900/50'}`}>
                        <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                        <span className="text-[10px] font-bold uppercase text-zinc-400">
                            {isLive ? 'Live Polling (3s)' : 'Paused'}
                        </span>
                    </div>
                    <button
                        onClick={() => setIsLive(!isLive)}
                        className="text-zinc-500 hover:text-white transition-colors"
                        title={isLive ? "Pause Updates" : "Resume Updates"}
                    >
                        {isLive ? <PauseCircle size={20} /> : <PlayCircle size={20} />}
                    </button>
                    <button
                        onClick={() => fetchLogs(false)}
                        className="text-zinc-500 hover:text-white transition-colors"
                        title="Refresh Now"
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>

            <Card className="flex-1 flex flex-col p-0 border border-zinc-800 bg-black overflow-hidden shadow-2xl relative">

                {/* Toolbar */}
                <div className="p-3 border-b border-zinc-900 bg-zinc-950 flex flex-col md:flex-row justify-between gap-4 shrink-0">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <Terminal size={16} className="text-zinc-500 shrink-0" />
                        <div className="flex flex-col">
                            <h1 className="text-sm font-bold text-white uppercase tracking-wider truncate">{botName}</h1>
                            <span className="text-[10px] text-zinc-600 font-mono hidden md:block">{botId}</span>
                        </div>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64 group">
                            <Search className="absolute left-3 top-2.5 text-zinc-600 group-focus-within:text-zinc-400 transition-colors" size={14} />
                            <input
                                placeholder="Search logs..."
                                className="w-full bg-black border border-zinc-800 py-2 pl-9 pr-2 text-xs text-white focus:border-zinc-600 outline-none font-mono placeholder:text-zinc-700 transition-colors rounded-sm"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button onClick={handleExport} className="px-4 py-2 bg-white text-black hover:bg-zinc-200 text-xs font-bold uppercase flex items-center gap-2 transition-colors rounded-sm">
                            <Download size={14} /> <span className="hidden sm:inline">Export</span>
                        </button>
                    </div>
                </div>

                {/* Log Terminal Area */}
                <div className="flex-1 relative overflow-hidden">
                    <div
                        ref={scrollRef}
                        onScroll={handleScroll}
                        className="absolute inset-0 overflow-y-auto custom-scrollbar p-4 space-y-0.5 font-mono text-[11px] bg-black"
                    >
                        {loading && logs.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-2">
                                <Loader2 size={32} className="animate-spin text-zinc-400" />
                                <span>Connecting to log stream...</span>
                            </div>
                        ) : error ? (
                            <div className="h-full flex flex-col items-center justify-center text-red-500 gap-2">
                                <XCircle size={32} />
                                <span>Failed to load logs. Is the bot ID correct?</span>
                            </div>
                        ) : filteredLogs.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-zinc-600 italic">
                                No logs found matching filter.
                            </div>
                        ) : (
                            filteredLogs.map((log) => {
                                const levelInfo = getLevelDetails(log.level);
                                const timeStr = new Date(log.timestamp).toISOString().replace('T', ' ').substring(0, 23);

                                return (
                                    <div key={log._id} className="grid grid-cols-12 gap-2 hover:bg-zinc-900/40 px-2 py-1 rounded transition-colors group items-start">
                                        <div className="col-span-3 lg:col-span-2 text-zinc-600 select-none whitespace-nowrap truncate" title={timeStr}>
                                            {timeStr.substring(11)}
                                        </div>
                                        <div className={`col-span-1 text-center select-none font-bold flex items-center gap-1 ${levelInfo.color}`}>
                                            <span className="hidden sm:inline">{levelInfo.label}</span>
                                            <span className="sm:hidden">{levelInfo.icon}</span>
                                        </div>
                                        <div className="col-span-8 lg:col-span-9 text-zinc-300 group-hover:text-white wrap-break-words">
                                            <span className="mr-2">{log.message}</span>
                                            {log.meta && (
                                                <div className="inline-flex gap-2 opacity-50 text-[10px] ml-2">
                                                    {log.meta.price !== undefined && <span className="text-emerald-400">Price: {log.meta.price}</span>}
                                                    {log.meta.signal && <span className="text-purple-400">Sig: {log.meta.signal}</span>}
                                                    {log.meta.reason && <span className="text-amber-400">Rsn: {log.meta.reason}</span>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                        <div className="h-2" />
                    </div>

                    {/* Scroll to Bottom Button (Visible when scrolled up) */}
                    {!shouldAutoScroll && logs.length > 0 && (
                        <button
                            onClick={scrollToBottom}
                            className="absolute bottom-4 right-6 bg-zinc-800 hover:bg-zinc-700 text-white p-2 rounded-full shadow-lg border border-zinc-700 transition-all opacity-90 hover:opacity-100 flex items-center gap-2 text-[10px] uppercase font-bold pr-4 animate-in fade-in slide-in-from-bottom-2"
                        >
                            <ArrowDown size={14} className="animate-bounce" />
                            Resume Auto-scroll
                        </button>
                    )}
                </div>

                {/* Footer Status Bar */}
                <div className="px-3 py-1.5 bg-zinc-950 border-t border-zinc-900 flex justify-between items-center text-[10px] text-zinc-600 font-mono select-none shrink-0">
                    <div className="flex gap-4">
                        <span>Count: {logs.length}</span>
                        <span>Mode: REST/Polling</span>
                    </div>
                    <div className="flex gap-4">
                        <span className="flex items-center gap-1">
                             <CheckCircle size={10} className={error ? "text-red-500" : "text-emerald-500"}/>
                            {error ? 'Connection Error' : 'System Healthy'}
                        </span>
                        <span className="flex items-center gap-1">
                            <RefreshCw size={10} className={loading && logs.length > 0 ? "animate-spin" : ""}/>
                            Last: {lastUpdated.toLocaleTimeString()}
                        </span>
                    </div>
                </div>
            </Card>
        </div>
    )
}
