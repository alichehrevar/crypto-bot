'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {Spinner} from "@heroui/react";

import { BotLog, LogApiResponse } from '@/types/admin/botLog';
import {getData} from "@/actions/get";

interface RecentBotLogsProps {
    botId: string;
}

const RecentBotLogs: React.FC<RecentBotLogsProps> = ({ botId }) => {
    const [logs, setLogs] = useState<BotLog[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<boolean>(false);

    useEffect(() => {
        let isMounted = true;

        async function fetchRecentLogs() {
            try {
                // limit to 5 logs
                const response: LogApiResponse = await getData(`/bots/${botId}/logs?limit=5&page=1`);

                if (isMounted && response.success) {
                    setLogs(response.data.logs);
                }
            } catch {
                if (isMounted) setError(true);
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        fetchRecentLogs();

        return () => { isMounted = false; };
    }, [botId]);

    const getStatusColor = (level: string) => {
        switch (level.toLowerCase()) {
            case 'error': return 'bg-red-500';
            case 'warn': return 'bg-yellow-500';
            // Default to a subtle dot for info/debug to save visual attention
            default: return 'bg-gray-300 dark:bg-gray-600';
        }
    };

    return (
        <div className="flex flex-col w-full gap-2 rounded-md overflow-y-auto thin-scrollbar relative">

            {/* Compact Header */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h4 className="font-semibold text-2xl text-white/60 mb-2">Log Info</h4>
                <Link
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                    href={`/admin/bots/${botId}/logs`}
                >
                    View All &rarr;
                </Link>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-[160px] relative">
                {loading && (
                    <div className="flex items-center justify-center flex-row-reverse gap-3 h-24 bg-dark-gray rounded-lg w-full">
                        <Spinner className="mr-2" color="primary" size="sm" variant="wave" />
                        Loading Data…
                    </div>
                )}

                {!loading && error && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-red-500">
                        Failed to load logs.
                    </div>
                )}

                {!loading && !error && logs.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-500">
                        No recent activity.
                    </div>
                )}

                {!loading && !error && logs.length > 0 && (
                    <ul className="divide-y divide-gray-100 dark:divide-gray-700/50">
                        {logs.map(log => (
                            <li key={log._id} className="px-4 py-2.5 flex items-start space-x-3 text-sm">
                                {/* Status Dot */}
                                <span aria-hidden="true" className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${getStatusColor(log.level)}`} />
                                <div className="min-w-0 flex-1">
                                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                                        {/* Use a short time format */}
                                        <time dateTime={log.timestamp}>
                                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </time>
                                    </div>
                                    <p className="text-gray-900 dark:text-gray-100 truncate" title={log.message}>
                                        {log.message}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default RecentBotLogs;
