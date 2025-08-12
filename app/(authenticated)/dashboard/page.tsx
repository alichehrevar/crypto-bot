'use client'

import React, {useState} from "react";
import {Divider} from "@heroui/react";

import AssetSection from "@/components/profile/dashboard/AssetSection";
import PnLSection from "@/components/profile/dashboard/PnLSection";
import TopMovers from "@/components/profile/dashboard/TopMovers";
import BotsList from "@/components/profile/bots/BotsList";
import AssetSummary from "@/components/profile/dashboard/assetSummary";
import {RecentActivities} from "@/components/shared/RecentActivities";
import CommunityBotList from "@/components/shared/communityBot/CommunityBotList";
import TopCreators from "@/components/shared/TopCreators";

export default function Dashboard() {

    return (
        <section className="px-2 lg:px-8 mt-8 mx-auto w-full">
            <AssetSummary/>
            <Divider className="my-8"/>
            <div className="flex flex-row items-center lg:grid overflow-x-auto lg:grid-cols-3 gap-4 min-h-[220px]">
                <div
                    className="flex items-start justify-start flex-col bg-dark-gray rounded-2xl p-6 gap-4 min-h-[250px]">
                    <AssetSection/>
                </div>
                <div
                    className="flex items-start justify-start flex-col bg-dark-gray rounded-2xl py-6 px-3 gap-4 min-h-[250px]">
                    <PnLSection/>
                </div>
                <div
                    className="flex items-center justify-start flex-col bg-dark-gray rounded-2xl py-6 px-3 gap-4 h-full min-h-[250px]">
                    <TopMovers/>
                </div>
            </div>
            <div className="grid grid-cols-1 rounded-2xl lg:py-6">
                <CommunityBotList  />
            </div>
            <div className="grid grid-cols-1 rounded-2xl lg:py-6">
                <TopCreators />
            </div>
            <div className="grid grid-cols-1 bg-dark-gray mt-4 rounded-2xl py-6 px-3">
                <BotsList />
            </div>
            <div className="grid grid-cols-1 bg-dark-gray mt-4 rounded-2xl py-6 px-3">
                <RecentActivities/>
            </div>
        </section>
    )
}
