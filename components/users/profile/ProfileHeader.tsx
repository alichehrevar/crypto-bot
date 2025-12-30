'use client'

import React from 'react'
import Image from "next/image";
import { Hash, MapPin } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { UserDetails } from "@/types/users";

interface ProfileHeaderProps {
    user: UserDetails
}

export const ProfileHeader = ({ user }: ProfileHeaderProps) => {
    const fullName = `${user.info?.firstName || 'Unknown'} ${user.info?.lastName || 'User'}`;
    const locationInfo = user.locationHistory?.[0]?.deviceInfo;

    return (
        <div className="flex flex-col lg:flex-row gap-6 mb-8 items-stretch">
            <Card className="flex-1 flex flex-col md:flex-row gap-6 items-center md:items-start border-t-4 border-t-white">
                <div className="w-24 h-24 relative">
                    <Image
                        fill
                        src={user.info.avatar ? (process.env.CDN_URL! + user.info.avatar) : '/images/user-placeholder.png'}
                        className="w-24 h-24 rounded-full border-2 border-zinc-800 grayscale object-contain"
                        alt={fullName}
                    />
                </div>
                <div className="flex-1 text-center md:text-left">
                    <h1 className="text-3xl font-light text-white uppercase">
                        {fullName}
                    </h1>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-2 text-xs font-mono text-zinc-500">
                        <span className="flex items-center gap-1"><Hash size={12} /> {user._id}</span>
                        <span className="flex items-center gap-1"><MapPin size={12} /> {locationInfo?.country || 'Unknown'}</span>
                    </div>
                    <div className="mt-4 flex gap-2 justify-center md:justify-start">
                        <Badge variant={user.status}>{user.status.toUpperCase()}</Badge>
                        <Badge variant="outline">KYC L2 VERIFIED</Badge>
                    </div>
                </div>
            </Card>
            <div className="w-full lg:w-96 grid grid-cols-2 gap-4">
                <Card className="flex flex-col justify-between py-4 h-full">
                    <div className="text-[10px] uppercase text-zinc-500 font-bold mb-1">Total Equity (Est.)</div>
                    <div className="text-lg font-mono text-white truncate">{user.summary.currency === 'dollar' ? '$' : '€'}{user.summary.totalBalance}</div>
                </Card>
                <Card className="flex flex-col justify-between py-4 h-full">
                    <div className="text-[10px] uppercase text-zinc-500 font-bold mb-1">Available Fund</div>
                    <div className="text-lg font-mono text-zinc-400 truncate">{user.summary.currency === 'dollar' ? '$' : '€'}{user.summary.availableFunds}</div>
                </Card>
                <Card className="flex flex-col justify-between py-4 h-full">
                    <div className="text-[10px] uppercase text-zinc-500 font-bold mb-1">Active bots</div>
                    <div className="text-lg font-mono text-emerald-400">{user.activeBots}</div>
                </Card>
                <Card className="flex flex-col justify-between py-4 h-full">
                    <div className="text-[10px] uppercase text-zinc-500 font-bold mb-1">Total Deployed</div>
                    <div className="text-lg font-mono text-white">{user.totalBots}</div>
                </Card>
            </div>
        </div>
    )
}
