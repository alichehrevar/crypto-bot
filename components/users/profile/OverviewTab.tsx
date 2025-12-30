'use client'

import React, { useState, useMemo } from 'react'
import { Monitor, MapPin, History, Globe, Smartphone, Laptop, ExternalLink } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { Pagination } from '@/components/common/Pagination'
import { InteractiveChart } from '@/components/charts/InteractiveChart'
import { MOCK_PNL_DATA, MOCK_EQUITY_DATA, ActivityLog } from '@/lib/mock-service'
import { UserDetails } from "@/types/users";

// Helper for timestamp
const getTimestampFromId = (id: string) => {
    try {
        const timestamp = parseInt(id.substring(0, 8), 16) * 1000;
        return new Date(timestamp).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    } catch {
        return 'Unknown Date';
    }
};

interface OverviewTabProps {
    user: UserDetails;
}

export const OverviewTab = ({ user }: OverviewTabProps) => {
    const [chartType, setChartType] = useState<'PNL' | 'EQUITY'>('PNL')
    const [activityPage, setActivityPage] = useState(1)
    const [locationPage, setLocationPage] = useState(1)

    // Derived Data
    const userPlan = user.role === 'admin' ? 'PRO' : user.role === 'broker' ? 'ESSENTIAL' : 'BASIC';
    const locationInfo = user.locationHistory?.[0]?.deviceInfo;
    const currentLocation = locationInfo ? `${locationInfo.city || 'Unknown'}, ${locationInfo.country || 'Unknown'}` : 'Unknown Location';
    const currentIp = locationInfo?.ip || '0.0.0.0';

    const activityHistory: ActivityLog[] = useMemo(() => {
        const realLogs = user.locationHistory?.map(log => ({
            time: "2024-01-01 12:00", // Placeholder
            action: log.source.toUpperCase(),
            details: `Source: ${log.source} | Agent: ${log.deviceInfo.userAgent}`,
            ip: log.deviceInfo.ip
        })) || [];
        const mockTradeLogs: ActivityLog[] = [
            { time: '2024-10-24 14:20', action: 'BOT_START', details: 'Started DCA Bot BTC/USDT', ip: currentIp },
            { time: '2024-10-23 09:15', action: 'API_KEY_CREATE', details: 'Generated new Read-Only Key', ip: currentIp },
        ];
        return [...realLogs, ...mockTradeLogs];
    }, [user.locationHistory, currentIp]);

    // Pagination
    const ACTIVITY_PAGE_SIZE = 6;
    const paginatedActivity = useMemo(() => {
        const start = (activityPage - 1) * ACTIVITY_PAGE_SIZE
        return activityHistory.slice(start, start + ACTIVITY_PAGE_SIZE)
    }, [activityHistory, activityPage])
    const totalActivityPages = Math.ceil(activityHistory.length / ACTIVITY_PAGE_SIZE)

    const LOCATION_PAGE_SIZE = 5;
    const paginatedLocations = useMemo(() => {
        const history = user.locationHistory || [];
        const start = (locationPage - 1) * LOCATION_PAGE_SIZE;
        return history.slice(start, start + LOCATION_PAGE_SIZE);
    }, [user.locationHistory, locationPage]);
    const totalLocationPages = Math.ceil((user.locationHistory?.length || 0) / LOCATION_PAGE_SIZE);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-enter items-stretch">
            <InteractiveChart data={chartType === 'PNL' ? MOCK_PNL_DATA : MOCK_EQUITY_DATA} type={chartType} setType={setChartType} className="h-64" />

            {/* Dossier Card */}
            <Card className="h-64 flex flex-col">
                <h3 className="text-xs font-bold uppercase text-zinc-500 mb-6">Dossier</h3>
                <div className="space-y-4 text-sm flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="flex justify-between border-b border-zinc-900 pb-2">
                        <span className="text-zinc-500">Email</span>
                        <span className="text-zinc-300">{user.email}</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-900 pb-2">
                        <span className="text-zinc-500">Phone</span>
                        <span className="text-zinc-300">+1 202 555 0192 (Mock)</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-900 pb-2">
                        <span className="text-zinc-500">Current Plan</span>
                        <span className="text-white font-bold">{userPlan} <span className="text-zinc-500 font-normal">(Monthly)</span></span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-900 pb-2">
                        <span className="text-zinc-500">Brokers</span>
                        <span className="text-zinc-300 flex gap-2">
                            <span className="bg-zinc-900 px-1 border border-zinc-800 text-[10px]">Binance</span>
                            <span className="bg-zinc-900 px-1 border border-zinc-800 text-[10px]">ByBit</span>
                        </span>
                    </div>
                    <div className="pt-2 mt-auto">
                        <h4 className="text-[10px] uppercase font-bold text-zinc-500 mb-2">Last Known Session</h4>
                        <div className="flex justify-between items-center bg-zinc-900 p-3 border border-zinc-800 rounded">
                            <div className="flex items-center gap-2">
                                <Monitor size={14} className="text-zinc-500" />
                                <span className="text-zinc-300 font-mono text-xs">{currentIp}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                                <MapPin size={10} /> {currentLocation}
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Activity Stream */}
            <div className="lg:col-span-2 border border-zinc-800 bg-zinc-950 p-0">
                <div className="p-6 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                        <History size={14} /> User Activity Stream
                    </h3>
                </div>
                <div className="space-y-4 px-6 pb-4">
                    {paginatedActivity.length > 0 ? paginatedActivity.map((act, i) => (
                        <div key={i} className="flex items-start gap-4 border-b border-zinc-900/50 pb-3 last:border-0 last:pb-0">
                            <div className="min-w-25 text-[10px] font-mono text-zinc-500 pt-0.5">{act.time}</div>
                            <div className="flex-1">
                                <div className="text-xs font-bold text-white">{act.action}</div>
                                <div className="text-[10px] text-zinc-400">{act.details}</div>
                            </div>
                            {act.ip && (
                                <div className="text-[10px] font-mono text-zinc-600 bg-zinc-900 px-2 py-0.5 rounded">{act.ip}</div>
                            )}
                        </div>
                    )) : (
                        <div className="text-zinc-500 text-xs text-center py-4">No activity recorded.</div>
                    )}
                </div>
                <Pagination page={activityPage} setPage={setActivityPage} total={totalActivityPages} label="Activity" />
            </div>

            {/* Location History */}
            <div className="lg:col-span-2 border border-zinc-800 bg-zinc-950 p-0">
                <div className="p-6 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                        <Globe size={14} /> Global Location History
                    </h3>
                </div>

                <div className="overflow-x-auto px-6 pb-4">
                    <table className="w-full text-left text-sm">
                        <thead className="text-[10px] text-zinc-600 uppercase border-b border-zinc-900">
                        <tr>
                            <th className="pb-3 pl-2 font-normal text-left">Timestamp</th>
                            <th className="pb-3 font-normal text-left">Location</th>
                            <th className="pb-3 font-normal text-left">Device</th>
                            <th className="pb-3 font-normal text-left">Source</th>
                            <th className="pb-3 pr-2 font-normal text-right">Coordinates</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900">
                        {paginatedLocations.length > 0 ? paginatedLocations.map((log) => {
                            const time = getTimestampFromId(log._id);
                            const isMobile = log.deviceInfo.userAgent.toLowerCase().includes('mobile');

                            return (
                                <tr key={log._id} className="group hover:bg-zinc-900/30 transition-colors">
                                    <td className="py-3 pl-2 font-mono text-zinc-500 text-xs">
                                        {time}
                                    </td>
                                    <td className="py-3">
                                        <div className="flex flex-col">
                                            <span className="text-white text-xs font-bold">{log.deviceInfo.city}, {log.deviceInfo.country}</span>
                                            <span className="text-[10px] font-mono text-zinc-500">{log.deviceInfo.ip}</span>
                                        </div>
                                    </td>
                                    <td className="py-3">
                                        <div className="flex items-center gap-2">
                                            {isMobile ? <Smartphone size={14} className="text-zinc-600" /> : <Laptop size={14} className="text-zinc-600" />}
                                            <span className="text-zinc-400 text-xs truncate max-w-37.5 block" title={log.deviceInfo.userAgent}>
                                                {log.deviceInfo.userAgent}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-3">
                                        <Badge variant={log.source === 'login' ? 'RUNNING' : 'BASIC'}>
                                            {log.source.toUpperCase()}
                                        </Badge>
                                    </td>
                                    <td className="py-3 pr-2 text-right">
                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${log.location.coordinates[1]},${log.location.coordinates[0]}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 text-[10px] font-mono text-zinc-500 hover:text-emerald-400 transition-colors border border-zinc-800 hover:border-emerald-500/50 rounded px-2 py-1 bg-black"
                                        >
                                            {log.location.coordinates[1].toFixed(4)}, {log.location.coordinates[0].toFixed(4)}
                                            <ExternalLink size={8} />
                                        </a>
                                    </td>
                                </tr>
                            )
                        }) : (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-zinc-500 text-xs italic">
                                    No location history found for this user.
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
                <Pagination page={locationPage} setPage={setLocationPage} total={totalLocationPages} label="Locations" />
            </div>
        </div>
    )
}
