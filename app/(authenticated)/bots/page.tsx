'use client'

import React from "react";
import {Tab, Tabs} from "@heroui/react";

import BotSelectionComponent from "@/components/bots/BotSelectionComponent";
import BotProgressChart from "@/components/shared/charts/BotProgressChart";
import BotsList from "@/components/bots/BotsList";
import {RecentBots} from "@/components/shared/RecentBots";
import DeployButton from "@/components/shared/ui/DeployButton";

export default function BotsPage() {

    return (
        <div className="mx-auto flex-1 pt-8 relative lg:px-8 h-screen overflow-y-auto">
            <div className="flex items-center justify-center flex-col w-full gap-10">
                <div className="w-full flex flex-col lg:flex-row gap-4 lg:gap-x-8 items-start">
                    <BotSelectionComponent/>
                    <BotProgressChart/>
                </div>
                <div className="grid grid-cols-1 rounded-lg lg:py-6">
                    <RecentBots/>
                </div>
                <div className="grid grid-cols-1 bg-dark-gray rounded-lg lg:py-6 lg:px-3 w-full min-h-[300px] relative">
                    <div className="absolute top-7 right-6 z-10">
                        <DeployButton />
                    </div>
                    <Tabs
                        aria-label="Tabs variants"
                        classNames={{
                            tab: 'pb-4'
                        }}
                        variant="underlined"
                    >
                        <Tab key="active-bots" title="Active Bots">
                            <BotsList showDeployButton={false} showTitle={false} />
                        </Tab>
                        <Tab key="recent-bots" title="Recent Bots">
                            <BotsList active={false} showTitle={false} />
                        </Tab>
                    </Tabs>
                </div>
            </div>
        </div>
    )
}
