'use client'

import React, { useState, useEffect, useCallback } from "react";
import { Search, Terminal, Activity, DollarSign, BarChart2, Download, Loader2 } from "lucide-react";
import { PremiumCheckbox } from "@/components/common/PremiumCheckbox";
import { Pagination } from "@/components/common/Pagination";
import { getData, downloadLog } from "@/actions/get";
import { useToast } from "@/components/providers/ToastProvider";

// --- Types ---

interface LogMetadataDetails {
    botId: string;
    price?: number;
    volume?: number;
    indicators?: Record<string, string>;
    finalSignal?: string;
    method?: string;
    [key: string]: unknown;
}

interface LogMetaWrapper {
    metadata: LogMetadataDetails;
}

interface BotLogEntry {
    _id: string;
    timestamp: string;
    level: string;
    message: string;
    meta?: LogMetaWrapper;
}

interface LogApiResponse {
    success: boolean;
    botName?: string;
    logs: BotLogEntry[];
}

interface LogsConsoleProps {
    botId: string;
}

export default function LogsConsole({ botId }: LogsConsoleProps) {
    const { addToast } = useToast();

    // --- State ---
    const [logs, setLogs] = useState<BotLogEntry[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [isDownloading, setIsDownloading] = useState<boolean>(false); // New state for download
    const [botName, setBotName] = useState<string>("");

    // Filters
    const [logSearch, setLogSearch] = useState<string>("");
    const [filterInfo, setFilterInfo] = useState<boolean>(true);
    const [filterWarn, setFilterWarn] = useState<boolean>(true);
    const [filterError, setFilterError] = useState<boolean>(true);

    // Pagination
    const [logPage, setLogPage] = useState<number>(1);
    const ITEMS_PER_PAGE = 100;

    // Command Input
    const [command, setCommand] = useState<string>("");

    // --- API Fetching ---
    const fetchLogs = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const response: LogApiResponse = await getData(`/bots/${botId}/logs?limit=200`);

            if (response && response.success) {
                setLogs(response.logs);
                if (response.botName) setBotName(response.botName);
            }
        } catch (err) {
            console.error("Failed to fetch logs", err);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [botId]);

    // Initial Load & Polling
    useEffect(() => {
        fetchLogs();
        const intervalId = setInterval(() => fetchLogs(true), 3000);
        return () => clearInterval(intervalId);
    }, [fetchLogs]);

    // --- Download Logic ---
    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            // 1. Fetch Base64 string from Server Action
            const base64Data = await downloadLog(`/bots/${botId}/logs/download`);

            if (!base64Data) {
                throw new Error("No content received");
            }

            // 2. Convert Base64 back to Binary (Uint8Array)
            const binaryString = window.atob(base64Data);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // 3. Create Blob with correct ZIP MIME type
            const blob = new Blob([bytes], { type: 'application/zip' });
            const url = window.URL.createObjectURL(blob);

            // 4. Trigger Download
            const link = document.createElement('a');
            link.href = url;
            // FIX: Extension must be .zip
            link.setAttribute('download', `${botName || 'bot'}_logs.zip`);
            document.body.appendChild(link);
            link.click();

            // Cleanup
            link.remove();
            window.URL.revokeObjectURL(url);

            addToast({ title: "Success", message: "Logs downloaded successfully", type: "success" });
        } catch (error) {
            console.error("Download error:", error);
            addToast({ title: "Error", message: "Failed to download logs", type: "error" });
        } finally {
            setIsDownloading(false);
        }
    };

    // --- Filtering Logic ---
    const filteredLogs = logs.filter(log => {
        const searchLower = logSearch.toLowerCase();
        const matchesSearch =
            log.message.toLowerCase().includes(searchLower) ||
            log.level.toLowerCase().includes(searchLower) ||
            (log.meta?.metadata?.finalSignal?.toLowerCase().includes(searchLower) ?? false);

        const level = log.level.toLowerCase();
        if (level === 'info' && !filterInfo) return false;
        if (level === 'warn' && !filterWarn) return false;
        if (level === 'error' && !filterError) return false;

        return matchesSearch;
    });

    const totalLogPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE) || 1;
    const paginatedLogs = filteredLogs.slice(
        (logPage - 1) * ITEMS_PER_PAGE,
        logPage * ITEMS_PER_PAGE
    );

    // --- Visual Helpers ---
    const getLevelColor = (level: string) => {
        switch (level.toLowerCase()) {
            case 'error': return 'text-red-500';
            case 'warn': return 'text-amber-500';
            case 'info': default: return 'text-emerald-400';
        }
    };

    const handleCommandSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            addToast({ title: "Command Sent", message: `Executing: ${command}`, type: "success" });
            setCommand("");
        }
    };

    return (
        <div className="lg:col-span-3 border border-zinc-800 bg-black flex flex-col h-187.5 shadow-2xl relative">
            {/* Header */}
            <div className="p-4 pb-2 bg-zinc-950/50">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                        <Terminal size={14} className="text-emerald-500" />
                        System Logs {botName && <span className="text-zinc-600">:: {botName}</span>}
                    </h3>
                    {loading && !logs.length && <span className="text-[10px] text-emerald-500 animate-pulse">CONNECTING...</span>}
                </div>

                {/* Controls */}
                <div className="flex flex-col gap-3 mb-2">
                    <div className="relative group">
                        <Search className="absolute left-3 top-2.5 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" size={12} />
                        <input
                            value={logSearch}
                            onChange={(e) => {
                                setLogSearch(e.target.value);
                                setLogPage(1);
                            }}
                            className="w-full bg-zinc-900 border border-zinc-800 py-2 pl-9 pr-4 text-[10px] text-white focus:border-emerald-500/50 outline-none font-mono placeholder-zinc-600 uppercase transition-colors rounded-sm"
                            placeholder="Search Logs or Signals..."
                        />
                    </div>

                    {/* Filter & Actions Row */}
                    <div className="flex justify-between items-center">
                        <div className="flex gap-4">
                            <PremiumCheckbox label="Info" checked={filterInfo} onChange={() => setFilterInfo(!filterInfo)} />
                            <PremiumCheckbox label="Warn" checked={filterWarn} onChange={() => setFilterWarn(!filterWarn)} />
                            <PremiumCheckbox label="Error" checked={filterError} onChange={() => setFilterError(!filterError)} />
                        </div>

                        {/* Download Button */}
                        <button
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-emerald-500 transition-all rounded-sm text-[10px] font-mono uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Download Full Log History"
                        >
                            {isDownloading ? (
                                <Loader2 size={10} className="animate-spin" />
                            ) : (
                                <Download size={10} />
                            )}
                            {isDownloading ? 'Downloading...' : 'Export'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Log Feed */}
            <div className="flex-1 overflow-y-auto font-mono text-[10px] px-4 custom-scrollbar">
                {paginatedLogs.map((log) => {
                    const meta = log.meta?.metadata;
                    const hasContext = meta && (meta.price || meta.finalSignal || meta.indicators);

                    return (
                        <div key={log._id} className="group border-b border-zinc-900/50 py-1.5 hover:bg-zinc-900/20 transition-colors">
                            <div className="grid grid-cols-12 gap-2 items-start">
                                {/* Timestamp */}
                                <span className="col-span-3 sm:col-span-2 text-zinc-600 truncate group-hover:text-zinc-400 transition-colors">
                                    {new Date(log.timestamp).toLocaleTimeString('en-US', {
                                        hour12: false,
                                        hour: '2-digit',
                                        minute:'2-digit',
                                        second:'2-digit'
                                    })}
                                </span>

                                {/* Level */}
                                <span className={`col-span-2 sm:col-span-1 font-bold ${getLevelColor(log.level)} uppercase text-[9px] pt-0.5`}>
                                    [{log.level.charAt(0)}]
                                </span>

                                {/* Message */}
                                <div className="col-span-7 sm:col-span-9 text-zinc-300 wrap-break-word leading-tight">
                                    <span>{log.message}</span>
                                    {hasContext && (
                                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                            {meta.price && (
                                                <span className="flex items-center text-zinc-500">
                                                    <DollarSign size={8} className="mr-0.5" />
                                                    {meta.price.toFixed(2)}
                                                </span>
                                            )}
                                            {meta.volume && (
                                                <span className="flex items-center text-zinc-500">
                                                    <Activity size={8} className="mr-0.5" />
                                                    Vol: {Math.round(meta.volume).toLocaleString()}
                                                </span>
                                            )}
                                            {meta.finalSignal && (
                                                <span className={`font-bold px-1 rounded bg-zinc-800 ${
                                                    meta.finalSignal === 'BUY' ? 'text-emerald-400' :
                                                        meta.finalSignal === 'SELL' ? 'text-red-400' : 'text-zinc-400'
                                                }`}>
                                                    {meta.finalSignal}
                                                </span>
                                            )}
                                            {meta.indicators && Object.entries(meta.indicators).map(([key, val]) => (
                                                <span key={key} className="flex items-center text-zinc-500">
                                                    <BarChart2 size={8} className="mr-0.5" />
                                                    {key}: {val}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {filteredLogs.length === 0 && !loading && (
                    <div className="flex flex-col items-center justify-center h-40 text-zinc-600">
                        <Terminal size={24} className="mb-2 opacity-50" />
                        <span className="italic">No logs found</span>
                    </div>
                )}
            </div>

            {/* Footer / Console Input */}
            <div className="p-4 pt-0 border-t border-zinc-900 bg-zinc-950">
                <Pagination page={logPage} setPage={setLogPage} total={totalLogPages} label="Logs" />
                <div className="mt-2 pt-2 border-t border-zinc-900/50">
                    <div className="flex items-center gap-2">
                        <span className="text-emerald-500 animate-pulse text-xs">{'>'}</span>
                        <input
                            className="w-full bg-transparent border-none text-xs text-white p-2 focus:ring-0 focus:outline-none font-mono placeholder-zinc-700 transition-colors"
                            placeholder="Execute Command..."
                            value={command}
                            onChange={(e) => setCommand(e.target.value)}
                            onKeyDown={handleCommandSubmit}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
