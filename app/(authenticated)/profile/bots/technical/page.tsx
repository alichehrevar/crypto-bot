'use client'

import React, { useState } from "react";

import BotsList from "@/components/profile/bots/BotsList";
import TechnicalDeployBotSection from "@/components/profile/bots/deploy/TechnicalDeployBotSection";
import TradingViewAdvancedChart from "@/components/shared/charts/TradingViewAdvancedChart";
import PageTitleSection from "@/components/shared/ui/PageTitleSection";

export default function TechnicalBotsPage() {

  const [refreshBotsList, setRefreshBotsList] = useState<boolean>(false)

  return (
    <div className="w-full mt-4 relative px-5">
      <PageTitleSection title="Technical Bots" imagePath="/images/profile/heikin_ashi-motion.png" />
      <div className=" w-full flex items-start justify-center gap-6 mt-6">
        <div className="w-full lg:w-[76%] h-[60svh]">
          {/*<MarketWatchChart />*/}
          <TradingViewAdvancedChart />
          <div className="grid grid-cols-1 bg-dark-gray bg-white mt-4 rounded-2xl py-6 px-3 h-[32.2svh]">
            <BotsList refreshList={refreshBotsList} listType="indicator" />
          </div>
        </div>
        <div className="w-full lg:w-[24%]">
          {/* New Bot button */}
          <TechnicalDeployBotSection onSuccessAction={() => setRefreshBotsList(true)} />
        </div>
      </div>
    </div>
  )
}
