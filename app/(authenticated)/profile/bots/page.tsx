'use client'

import React, {useState} from "react";
import {Tab, Tabs} from "@heroui/react";

import BotSelectionComponent from "@/components/profile/bots/BotSelectionComponent";
import BotProgressChart from "@/components/shared/charts/BotProgressChart";
import BotsList from "@/components/profile/bots/BotsList";
import {RecentBots} from "@/components/shared/RecentBots";

export default function BotsPage() {

    const [refreshBotsList, setRefreshBotsList] = useState<boolean>(false)

    return (
        <div className="container mx-auto mt-4 relative lg:px-5">
            <div className="flex items-center justify-center flex-col w-full gap-10">
                <div className="w-full flex flex-col lg:flex-row gap-4 lg:gap-x-8 items-start">
                    <BotSelectionComponent/>
                    <BotProgressChart/>
                </div>
                <div className="grid grid-cols-1 rounded-2xl lg:py-6">
                    <RecentBots/>
                </div>
                <div className="grid grid-cols-1 bg-dark-gray rounded-2xl lg:py-6 lg:px-3 w-full min-h-[300px]">
                    <Tabs
                        aria-label="Tabs variants"
                        classNames={{
                            tab: 'pb-4'
                        }}
                        variant="underlined"
                    >
                        <Tab key="active-bots" title="Active Bots">
                            <BotsList refreshList={refreshBotsList} showTitle={false}/>
                        </Tab>
                        <Tab key="recent-bots" title="Recent Bots">
                            <BotsList active={false} refreshList={refreshBotsList} showTitle={false} />
                        </Tab>
                    </Tabs>
                </div>
            </div>
        </div>
    )
}
