'use client'

import React, { useState } from "react";

import BotSelectionComponent from "@/components/profile/bots/BotSelectionComponent";
import BotProgressChart from "@/components/shared/charts/BotProgressChart";
import BotsList from "@/components/profile/bots/BotsList";
import { RecentBots } from "@/components/shared/RecentBots";

export default function BotsPage() {

  const [refreshBotsList, setRefreshBotsList] = useState<boolean>(false)

  return (
    <div className="w-full mt-4 relative lg:px-5">
      <div className="flex items-center justify-center flex-col w-full gap-10">
        <div className="w-full flex flex-col lg:flex-row gap-4 lg:gap-6 items-start justify-center">
          <BotSelectionComponent />
          <BotProgressChart />
        </div>
        <div className="grid grid-cols-1 mt-4 rounded-2xl lg:py-6 lg:px-3">
          <RecentBots />
        </div>
        <div className="grid grid-cols-1 dark:bg-[#161616] bg-white mt-4 rounded-2xl lg:py-6 lg:px-3">
          <BotsList refreshList={refreshBotsList} />
        </div>
      </div>
    </div>
  )
}
