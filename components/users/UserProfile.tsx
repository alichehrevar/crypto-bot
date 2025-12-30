'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { UserDetails } from "@/types/users"

// Sub-components
import { ProfileHeader } from './profile/ProfileHeader'
import { OverviewTab } from './profile/OverviewTab'
import { BotsTab } from './profile/BotsTab'
import { BillingTab } from './profile/BillingTab'
import { ActionsTab } from './profile/ActionsTab'

interface UserProfileProps {
    user: UserDetails
}

export function UserProfile({ user }: UserProfileProps) {
    const [tab, setTab] = useState('OVERVIEW')

    return (
        <div className="animate-enter space-y-6">
            <Link
                href="/users"
                className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 uppercase tracking-widest transition-colors"
            >
                <ArrowLeft size={14} /> Return to Hub
            </Link>

            {/* Top Header Section */}
            <ProfileHeader user={user} />

            {/* Tab Navigation */}
            <div className="border-b border-zinc-800 flex overflow-x-auto">
                {['OVERVIEW', 'BOTS', 'BILLING', 'ACTION'].map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-8 py-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap cursor-pointer
                            ${tab === t ? 'border-white text-white bg-zinc-900/30' : 'border-transparent text-zinc-600 hover:text-white'}
                        `}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-100">
                {tab === 'OVERVIEW' && <OverviewTab user={user} />}
                {tab === 'BOTS' && <BotsTab userId={user._id} />}
                {tab === 'BILLING' && <BillingTab />}
                {tab === 'ACTION' && <ActionsTab user={user} />}
            </div>
        </div>
    )
}
