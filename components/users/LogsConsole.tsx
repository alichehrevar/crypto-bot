'use client'

import React, { useState, useEffect, useCallback } from "react";
import { Search, Terminal } from "lucide-react";
import { PremiumCheckbox } from "@/components/common/PremiumCheckbox";
import { Pagination } from "@/components/common/Pagination";
import { getData } from "@/actions/get";
import {useToast} from "@/components/providers/ToastProvider"; // Imported API action

type LogMetaValue = string | number | boolean | null | undefined;

// --- Types (Mirrored from reference) ---
interface LogMeta {
    [key: string]: LogMetaValue;
}

interface BotLogEntry {
    _id: string;
    timestamp: string; // API usually returns ISO string
    level: string;
    message: string;
    meta?: LogMeta;
}

interface LogApiResponse {
    success: boolean;
    logs: BotLogEntry[];
}

interface LogsConsoleProps {
    botId: string; // Added prop to know which bot to fetch
}

export default function LogsConsole({ botId }: LogsConsoleProps) {

    const { addToast } = useToast()

    // --- State ---
    const [logs, setLogs] = useState<BotLogEntry[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    // Filters
    const [logSearch, setLogSearch] = useState<string>("");
    const [filterInfo, setFilterInfo] = useState<boolean>(true);
    const [filterWarn, setFilterWarn] = useState<boolean>(true);
    const [filterError, setFilterError] = useState<boolean>(true);

    // Pagination
    const [logPage, setLogPage] = useState<number>(1);
    const ITEMS_PER_PAGE = 200; // Adjusted based on height class h-187.5

    // Command Input State
    const [command, setCommand] = useState<string>("");

    // --- API Fetching ---
    const fetchLogs = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            // Using the same endpoint pattern as your reference
            const response: LogApiResponse = await getData(`/bots/${botId}/logs?limit=200`);

            if (response && response.success) {
                // Sort by new -> old
                const sortedLogs = [...response.logs].reverse();
                setLogs(sortedLogs);
            }
        } catch (err) {
            console.error("Failed to fetch logs", err);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [botId]);

    // Initial Load
    useEffect(() => {
        fetchLogs().catch(() => addToast({ title: "Error", message: "Failed to load bot logs", type: "warning" }));
    }, [addToast, fetchLogs]);

    // Polling Effect (3 seconds)
    useEffect(() => {
        const intervalId = setInterval(() => {
            fetchLogs(true).catch(() => addToast({ title: "Error", message: "Failed to load bot logs", type: "warning" }));
        }, 3000);
        return () => clearInterval(intervalId);
    }, [addToast, fetchLogs]);

    // --- Filtering Logic ---
    const filteredLogs = logs.filter(log => {
        const matchesSearch = log.message.toLowerCase().includes(logSearch.toLowerCase()) ||
            log.level.toLowerCase().includes(logSearch.toLowerCase());

        // Checkboxes logic
        const level = log.level.toLowerCase();
        if (level === 'info' && !filterInfo) return false;
        if (level === 'warn' && !filterWarn) return false;
        if (level === 'error' && !filterError) return false;

        return matchesSearch;
    });

    // --- Pagination Logic ---
    const totalLogPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE) || 1;
    const paginatedLogs = filteredLogs.slice(
        (logPage - 1) * ITEMS_PER_PAGE,
        logPage * ITEMS_PER_PAGE
    );

    // --- Helpers ---
    const getLevelColor = (level: string) => {
        switch (level.toLowerCase()) {
            case 'error': return 'text-red-500';
            case 'warn': return 'text-amber-500';
            case 'info': default: return 'text-blue-400';
        }
    };

    const handleCommandSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            // Placeholder for command logic
            console.log("Command executed:", command);
            setCommand("");
        }
    };

    return (
        <div className="lg:col-span-3 border border-zinc-800 bg-black flex flex-col h-187.5 shadow-2xl">
            <div className="p-4 pb-2">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                        <Terminal size={14} /> System Logs
                    </h3>
                    {/* Optional: Add loading indicator here if desired, keeping style minimal */}
                    {loading && logs.length === 0 && <span className="text-[10px] text-zinc-700 animate-pulse">SYNCING...</span>}
                </div>

                <div className="flex flex-col gap-3 mb-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-zinc-500" size={12} />
                        <input
                            value={logSearch}
                            onChange={(e) => {
                                setLogSearch(e.target.value);
                                setLogPage(1); // Reset to page 1 on search
                            }}
                            className="w-full bg-zinc-900 border border-zinc-800 py-2 pl-9 pr-4 text-[10px] text-white focus:border-zinc-600 outline-none font-mono placeholder-zinc-600 uppercase transition-colors"
                            placeholder="Search System Logs..."
                        />
                    </div>
                    <div className="flex gap-4">
                        <PremiumCheckbox label="Info" checked={filterInfo} onChange={() => setFilterInfo(!filterInfo)} />
                        <PremiumCheckbox label="Warn" checked={filterWarn} onChange={() => setFilterWarn(!filterWarn)} />
                        <PremiumCheckbox label="Error" checked={filterError} onChange={() => setFilterError(!filterError)} />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto font-mono text-[10px] space-y-2 px-4 custom-scrollbar">
                {paginatedLogs.map((log) => (
                    <div key={log._id} className="grid grid-cols-12 gap-2 border-b border-zinc-900/30 pb-1 hover:bg-zinc-900/10 transition-colors">
                        <span className="col-span-3 text-zinc-500 truncate">
                            {/* Converted API ISO string to Date for formatting */}
                            {new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                        </span>
                        <span className={`col-span-2 font-bold ${getLevelColor(log.level)} uppercase`}>
                            {log.level}
                        </span>
                        <span className="col-span-7 text-white wrap-break-word">
                            {log.message}
                        </span>
                    </div>
                ))}

                {filteredLogs.length === 0 && !loading && (
                    <div className="text-zinc-600 italic text-center py-4">No logs found matching criteria</div>
                )}
            </div>

            <div className="p-4 pt-0 border-t border-zinc-900 bg-zinc-950">
                <Pagination page={logPage} setPage={setLogPage} total={totalLogPages} label="Logs" />
                <div className="mt-2 pt-2 border-t border-zinc-900">
                    <input
                        className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white p-2 focus:outline-none focus:border-emerald-500/50 font-mono placeholder-zinc-600 transition-colors"
                        placeholder="> Execute Command..."
                        value={command}
                        onChange={(e) => setCommand(e.target.value)}
                        onKeyDown={handleCommandSubmit}
                    />
                </div>
            </div>
        </div>
    )
}
