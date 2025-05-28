'use client'

import React, { useState } from "react";

import TechnicalBotsList from "@/components/profile/bots/technical/TechnicalBotsList";
import DeployBotSection from "@/components/profile/bots/deploy/DeployBotSection";
import { PlusIcon } from "@/utils/icons";
import BotSelectionComponent from "@/components/profile/bots/BotSelectionComponent";
import MarketWatchChart from "@/components/shared/charts/MarketWatchChart";
import LiveCandlestickChart from "@/components/shared/charts/LiveCandlestickChart";

export default function TechnicalBotsPage() {

  const [refreshBotsList, setRefreshBotsList] = useState<boolean>(false)

  return (
    <div className="container mt-4 relative px-5">
      <div className=" w-full flex items-start justify-center gap-6">
        <div className="w-full lg:w-[65%] h-[600px]">
          <MarketWatchChart />
        </div>
        <div className="w-full lg:w-[35%]">
          {/* New Bot button */}
          <DeployBotSection onSuccessAction={() => setRefreshBotsList(true)} />
        </div>
        {/*<LiveCandlestickChart symbol="BTCUSDT" interval="1m" height={350} />*/}
      </div>
      <BotSelectionComponent />
      <div className="grid grid-cols-1 dark:bg-[#161616] bg-white mt-4 rounded-2xl py-6 px-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold ml-4 mb-4">Bots List</h3>
        </div>
        <TechnicalBotsList refreshList={refreshBotsList} />
      </div>
    </div>
  )
}
