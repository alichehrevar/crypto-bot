'use client'

import React, { useState } from "react";

import TechnicalBotsList from "@/components/profile/bots/technical/TechnicalBotsList";
import TechnicalDeployBotSection from "@/components/profile/bots/deploy/TechnicalDeployBotSection";
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
            <TechnicalBotsList refreshList={refreshBotsList} />
          </div>
        </div>
        <div className="w-full lg:w-[28%]">
          {/* New Bot button */}
          <TechnicalDeployBotSection onSuccessAction={() => setRefreshBotsList(true)} />
        </div>
      </div>
    </div>
  )
}
