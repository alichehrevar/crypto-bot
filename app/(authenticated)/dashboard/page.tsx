'use client'

import React from "react";
import {Divider} from "@heroui/react";

import AssetSection from "@/components/dashboard/AssetSection";
import TopMovers from "@/components/dashboard/TopMovers";
import BotsList from "@/components/bots/BotsList";
import AssetSummary from "@/components/dashboard/assetSummary";
import {RecentActivities} from "@/components/shared/RecentActivities";
import CommunityBotList from "@/components/shared/communityBot/CommunityBotList";
import TopCreators from "@/components/shared/TopCreators";
import Instructions from "@/components/dashboard/Instructions";
import Watchlist from "@/components/dashboard/WatchList";
import PnLSection from "@/components/pnl/PnLSection";

export default function Dashboard() {

    return (
        <section className="px-2 lg:px-8 pt-8 mx-auto w-full flex-1 h-screen overflow-y-auto space-y-6">
            <AssetSummary/>
            <Divider className="my-8"/>
            <Instructions />
            <div className="flex flex-row items-center lg:grid overflow-x-auto lg:grid-cols-2 gap-4 min-h-[220px]">
                <AssetSection/>
                <PnLSection/>
                <TopMovers/>
                <Watchlist/>
            </div>
            <CommunityBotList  />
            <div className="pt-7 pb-12">
                <TopCreators />
            </div>
            <BotsList listType="indicator" />
            <RecentActivities/>
        </section>
    )
}
