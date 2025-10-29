'use client'

import React from "react";
import {Divider} from "@heroui/react";

import TopMovers from "@/components/dashboard/TopMovers";
import BotsList from "@/components/bots/BotsList";
import AssetSummary from "@/components/dashboard/assetSummary";
import {RecentActivities} from "@/components/shared/RecentActivities";
import CommunityBotList from "@/components/shared/communityBot/CommunityBotList";
import TopCreators from "@/components/shared/TopCreators";
import Instructions from "@/components/dashboard/Instructions";
import Watchlist from "@/components/dashboard/WatchList";
import PnLSection from "@/components/pnl/PnLSection";
import AssetsOverview from "@/components/dashboard/AssetsOverview";
import {RecentBots} from "@/components/shared/RecentBots";

export default function Dashboard() {

    return (
        <section className="container px-2 lg:px-4 pt-8 mx-auto w-full flex-1 space-y-10 no-scrollbar">
            <AssetSummary/>
            <Divider className="my-8"/>
            <Instructions />
            <div className="flex flex-row items-center lg:grid overflow-x-auto lg:grid-cols-2 gap-4 min-h-[220px]">
                <AssetsOverview/>
                <PnLSection/>
                <TopMovers/>
                <Watchlist/>
            </div>
            <RecentBots/>
            <TopCreators />
            <CommunityBotList  />
            <BotsList listType="indicator" />
            <RecentActivities/>
        </section>
    )
}
