import React from 'react'

export function UserProfileSkeleton() {
    return (
        <div className="space-y-6 animate-pulse w-full">
            {/* --- Breadcrumb Placeholder --- */}
            <div className="flex items-center gap-1">
                <div className="h-3 w-3 bg-zinc-800 rounded-full" />
                <div className="h-3 w-24 bg-zinc-800 rounded" />
            </div>

            {/* --- Header Section --- */}
            <div className="flex flex-col lg:flex-row gap-6 mb-8 items-stretch">

                {/* Profile Card Mock */}
                <div className="flex-1 flex flex-col md:flex-row gap-6 items-center md:items-start border border-zinc-800 bg-zinc-950 p-6 rounded-sm border-t-4 border-t-zinc-700">
                    {/* Avatar */}
                    <div className="w-24 h-24 rounded-full bg-zinc-800 shrink-0" />

                    <div className="flex-1 w-full flex flex-col items-center md:items-start space-y-4">
                        {/* Name */}
                        <div className="h-8 w-3/4 max-w-75 bg-zinc-800 rounded" />

                        {/* ID & Location */}
                        <div className="flex gap-4">
                            <div className="h-3 w-24 bg-zinc-900 rounded" />
                            <div className="h-3 w-24 bg-zinc-900 rounded" />
                        </div>

                        {/* Badges */}
                        <div className="flex gap-2 mt-2">
                            <div className="h-6 w-20 bg-zinc-800 rounded-sm" />
                            <div className="h-6 w-24 bg-zinc-800 rounded-sm border border-zinc-700" />
                        </div>
                    </div>
                </div>

                {/* Stats Grid Mock */}
                <div className="w-full lg:w-96 grid grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex flex-col justify-between py-4 px-4 border border-zinc-800 bg-zinc-950 h-24 rounded-sm">
                            <div className="h-2 w-20 bg-zinc-800 rounded mb-2" />
                            <div className="h-6 w-full bg-zinc-800 rounded" />
                        </div>
                    ))}
                </div>
            </div>

            {/* --- Tabs Mock --- */}
            <div className="border-b border-zinc-800 flex gap-0">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="px-8 py-4">
                        <div className="h-3 w-16 bg-zinc-800 rounded" />
                    </div>
                ))}
            </div>

            {/* --- Main Content Area (Simulating Overview Tab) --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">

                {/* Chart Placeholder */}
                <div className="h-64 border border-zinc-800 bg-zinc-950 p-4 rounded-sm flex flex-col justify-between">
                    <div className="flex justify-between mb-4">
                        <div className="h-4 w-32 bg-zinc-800 rounded" />
                        <div className="flex gap-2">
                            <div className="h-6 w-16 bg-zinc-800 rounded" />
                            <div className="h-6 w-16 bg-zinc-800 rounded" />
                        </div>
                    </div>
                    {/* Chart lines simulation */}
                    <div className="flex items-end justify-between h-full gap-2 px-2 pb-2">
                        {[...Array(12)].map((_, i) => {
                            const height = (i * 17) % 60 + 20;

                            return (
                                <div
                                    key={i}
                                    className="w-full bg-zinc-900 rounded-t-sm"
                                    style={{ height: `${height}%` }}
                                />
                            )
                        })}
                    </div>
                </div>

                {/* Dossier Placeholder */}
                <div className="h-64 border border-zinc-800 bg-zinc-950 p-6 rounded-sm flex flex-col">
                    <div className="h-3 w-20 bg-zinc-800 rounded mb-6" /> {/* Title */}
                    <div className="space-y-4 flex-1">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex justify-between border-b border-zinc-900 pb-2">
                                <div className="h-3 w-16 bg-zinc-900 rounded" />
                                <div className="h-3 w-32 bg-zinc-800 rounded" />
                            </div>
                        ))}
                    </div>
                    {/* Last Session Box */}
                    <div className="mt-auto pt-2">
                        <div className="h-2 w-24 bg-zinc-800 mb-2 rounded" />
                        <div className="h-10 w-full bg-zinc-900 border border-zinc-800 rounded" />
                    </div>
                </div>

                {/* Activity Stream Placeholder (Full Width) */}
                <div className="lg:col-span-2 border border-zinc-800 bg-zinc-950 p-0 rounded-sm">
                    <div className="p-6 pb-2 border-b border-zinc-900/50">
                        <div className="h-4 w-48 bg-zinc-800 rounded" />
                    </div>
                    <div className="p-6 space-y-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-start gap-4">
                                <div className="w-24 h-3 bg-zinc-900 rounded" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 w-48 bg-zinc-800 rounded" />
                                    <div className="h-2 w-64 bg-zinc-900 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    )
}
