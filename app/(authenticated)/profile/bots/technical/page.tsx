'use client'

import React, { useState } from "react";

import BotsList from "@/components/profile/bots/BotsList";
import TechnicalDeployBotSection from "@/components/profile/bots/deploy/TechnicalDeployBotSection";
import TradingViewAdvancedChart from "@/components/shared/charts/TradingViewAdvancedChart";
import PageTitleSection from "@/components/shared/ui/PageTitleSection";
import MarketList from "@/components/MarketList";

export default function TechnicalBotsPage() {

  const [refreshBotsList, setRefreshBotsList] = useState<boolean>(false)

  return (
    <div className="w-full mt-4 relative px-5">
      <PageTitleSection imagePath="/images/profile/heikin_ashi-motion.png" title="Technical Bots" />
      <div className=" w-full flex items-start justify-center gap-2 mt-6 max-h-screen">
        <div className="w-full lg:w-[24%] h-full self-stretch">
          {/* MarketList */}
          <MarketList />
        </div>
        <div className="w-full lg:w-[52%] h-[60svh]">
          {/*<MarketWatchChart />*/}
          <TradingViewAdvancedChart />
          <div className="grid grid-cols-1 bg-dark-gray bg-white mt-2 rounded-2xl py-6 px-3 h-[33.2svh]">
            <BotsList listType="indicator" refreshList={refreshBotsList} />
          </div>
        </div>
        <div className="w-full lg:w-[24%] self-stretch">
          {/* New Bot button */}
          <TechnicalDeployBotSection onSuccessAction={() => setRefreshBotsList(true)} />
        </div>
      </div>
    </div>
  )
}
