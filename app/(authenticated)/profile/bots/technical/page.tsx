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
      <div className=" w-full flex items-start justify-center gap-2 mt-2 h-[100svh]">
        <div className="w-full lg:w-[76%] self-stretch">
          <div className="flex items-start justify-center gap-2 h-[75%]">
            <div className="w-1/3 h-full">
              {/* MarketList */}
              <MarketList />
            </div>
            <div className="w-2/3 h-full">
              {/*<MarketWatchChart />*/}
              <TradingViewAdvancedChart />
            </div>
          </div>

          <div className="grid grid-cols-1 bg-dark-gray bg-white mt-2 rounded-2xl py-6 px-3 h-[24%]">
            <BotsList listType="indicator" refreshList={refreshBotsList} />
          </div>
        </div>
        <div className="w-full lg:w-[24%] h-[100svh]">
          {/* New Bot button */}
          <TechnicalDeployBotSection onSuccessAction={() => setRefreshBotsList(true)} />
        </div>
      </div>
    </div>
  )
}
