'use client'

import React, { useState } from "react";

import BotsList from "@/components/profile/bots/BotsList";
import GridDeployBotSection from "@/components/profile/bots/deploy/GridDeployBotSection";
import TradingViewAdvancedChart from "@/components/shared/charts/TradingViewAdvancedChart";


export default function TechnicalBotsPage() {

  const [refreshBotsList, setRefreshBotsList] = useState<boolean>(false)

  return (
    <div className="container mt-4 relative px-5">
      <div className=" w-full flex items-start justify-center gap-6">
        <div className="w-full lg:w-[72%] h-[60svh]">
          {/*<MarketWatchChart />*/}
          <TradingViewAdvancedChart />
          <div className="grid grid-cols-1 dark:bg-[#161616] bg-white mt-4 rounded-2xl py-6 px-3 h-[32.2svh]">
            <BotsList refreshList={refreshBotsList} listType="grid" />
          </div>
        </div>
        <div className="w-full lg:w-[28%]">
          {/* New Bot button */}
          <GridDeployBotSection onSuccessAction={() => setRefreshBotsList(true)} />
        </div>
      </div>
    </div>
  )
}
