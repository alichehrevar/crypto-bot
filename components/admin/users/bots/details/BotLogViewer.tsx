'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import debounce from 'lodash.debounce';

import { BotLog, LogApiResponse } from '@/types/admin/botLog';
import {getData} from "@/actions/get";

export default function BotLogViewer({ botId }: {botId: string}) {
    const [logs, setLogs] = useState<BotLog[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Pagination & Search State
    const [page, setPage] = useState<number>(1);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [searchTerm, setSearchTerm] = useState<string>('');

    // State for expanding row details (for complex meta/JSON)
    const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());

    const fetchLogs = useCallback(async (currentPage: number, search: string) => {
        setLoading(true);
        setError(null);
        try {
            const queryParams = new URLSearchParams({
                page: currentPage.toString(),
                limit: '50',
            });

            if (search) {
                queryParams.append('search', search);
            }

            const data: LogApiResponse = await getData(`/api/bots/${botId}/logs?${queryParams.toString()}`);

            if (data.success) {
                setLogs(data.data.logs);
                setTotalPages(data.data.pagination.totalPages);
                setPage(data.data.pagination.currentPage);
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    }, [botId]);

    // Debounce the search to avoid hammering the backend on every keystroke
    const debouncedFetch = useMemo(
        () => debounce((searchTerm: string) => {
            setPage(1); // Reset to page 1 on new search
            fetchLogs(1, searchTerm);
        }, 500),
        [fetchLogs]
    );

    // Initial fetch and cleanup
    useEffect(() => {
        fetchLogs(page, searchTerm);

        return () => {
            debouncedFetch.cancel();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]); // Only re-fetch immediately when PAGE changes. Search handled by debounce.

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;

        setSearchTerm(value);
        debouncedFetch(value);
    };

    const toggleRowExpansion = (id: string) => {
        const newSet = new Set(expandedRowIds);

        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setExpandedRowIds(newSet);
    };

    // Level color helper
    const getLevelBadge = (level: string) => {
        switch (level.toLowerCase()) {
            case 'error': return 'bg-red-100 text-red-800 border-red-200';
            case 'warn': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'debug': return 'bg-gray-100 text-gray-800 border-gray-300';
            case 'info':
            default: return 'bg-blue-50 text-blue-600 border-blue-200';
        }
    };

    return (
        <div className="glass-card shadow overflow-hidden">
            {/* Header & Search Toolkit */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                    Bot Operations Log
                </h3>
                <div className="relative w-full sm:w-72">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        {/* Simple Search Icon SVG */}
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                        </svg>
                    </div>
                    <input
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Search logs message..."
                        type="text"
                        value={searchTerm}
                        onChange={handleSearchChange}
                    />
                </div>
            </div>

            {/* Log Content Area */}
            <div className="relative min-h-[400px]">
                {loading && (
                    <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 flex items-center justify-center z-10 backdrop-blur-sm">
                        <div className="text-indigo-600 dark:text-indigo-400 font-semibold">Loading logs...</div>
                    </div>
                )}

                {error && (
                    <div className="p-4 text-center text-red-500 dark:text-red-400">
                        Error: {error}
                    </div>
                )}

                {!loading && !error && logs.length === 0 && (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        No logs found for this criteria.
                    </div>
                )}

                {logs.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-48" scope="col">
                                    Timestamp
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24" scope="col">
                                    Level
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                                    Message
                                </th>
                            </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {logs.map((log) => {
                                const isExpanded = expandedRowIds.has(log._id);
                                const hasMeta = log.meta && Object.keys(log.meta).length > 0;

                                return (
                                    <React.Fragment key={log._id}>
                                        <tr
                                            className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${isExpanded ? 'bg-gray-50 dark:bg-gray-700/50' : ''}`}
                                            onClick={() => hasMeta && toggleRowExpansion(log._id)}
                                        >
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 font-mono">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full border ${getLevelBadge(log.level)}`}>
                                                        {log.level.toUpperCase()}
                                                    </span>
                                            </td>
                                            <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200 relative">
                                                <div className="flex items-center justify-between">
                                                    <span className="truncate pr-4">{log.message}</span>
                                                    {hasMeta && (
                                                        <span className="text-xs text-gray-400">
                                                                {isExpanded ? 'Hide Details ▲' : 'View Details ▼'}
                                                            </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        {/* Expandable Meta Data Row */}
                                        {isExpanded && hasMeta && (
                                            <tr className="bg-gray-50 dark:bg-gray-900/50">
                                                <td className="px-4 py-3" colSpan={3}>
                                                        <pre className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-950 p-3 rounded-md overflow-x-auto border border-gray-200 dark:border-gray-700">
                                                            {/* Pretty print the JSON meta data */}
                                                            {JSON.stringify(log.meta, null, 2)}
                                                        </pre>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination Footer */}
            <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
                <div className="flex-1 flex justify-between sm:hidden">
                    <button
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        disabled={page === 1 || loading}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                        Previous
                    </button>
                    <button
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        disabled={page === totalPages || loading}
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    >
                        Next
                    </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm text-gray-700 dark:text-gray-400">
                            Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
                        </p>
                    </div>
                    <div>
                        <nav aria-label="Pagination" className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                            <button
                                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                                disabled={page === 1 || loading}
                                onClick={() => setPage(1)}
                            >
                                <span>First</span>
                            </button>
                            <button
                                className="relative inline-flex items-center px-2 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                                disabled={page === 1 || loading}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                            >
                                <span className="sr-only">Previous</span>
                                {/* Chevron Left SVG */}
                                <svg aria-hidden="true" className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                    <path clipRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" fillRule="evenodd" />
                                </svg>
                            </button>
                            <button
                                className="relative inline-flex items-center px-2 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                                disabled={page === totalPages || loading}
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            >
                                <span className="sr-only">Next</span>
                                {/* Chevron Right SVG */}
                                <svg aria-hidden="true" className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                    <path clipRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" fillRule="evenodd" />
                                </svg>
                            </button>
                        </nav>
                    </div>
                </div>
            </div>
        </div>
    );
}
