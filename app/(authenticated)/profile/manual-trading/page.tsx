'use client'

import React, { useState } from "react";

import TechnicalBotsList from "@/components/profile/bots/technical/TechnicalBotsList";
import TradingViewAdvancedChart from "@/components/shared/charts/TradingViewAdvancedChart";
import ManualTradeSection from "@/components/profile/bots/deploy/ManualTradeSection";
import { OrderBook } from "@/components/shared/OrderBook";
import TechnicalAnalysis from "@/components/shared/TechnicalAnalysis";

export default function TechnicalBotsPage() {

  const [refreshBotsList, setRefreshBotsList] = useState<boolean>(false)

  return (
    <div className="container mt-4 relative px-5">
      <div className=" w-full flex items-start justify-center gap-6">
        <div className="w-full lg:w-[72%] h-[60svh]">
          {/*<MarketWatchChart />*/}
          <div className="grid grid-cols-1 lg:grid-cols-[35%_65%] gap-4 order-book-parent">
            <OrderBook />
            <div className="flex items-center justify-center flex-col gap-4">
              <div className="flex w-full h-[400px]">
                <TradingViewAdvancedChart />
              </div>
              <div className="flex w-full h-[300px] technical-analysis">
                <TechnicalAnalysis />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 dark:bg-[#161616] bg-white mt-4 rounded-2xl py-6 px-3 h-[32.2svh]">
            <TechnicalBotsList refreshList={refreshBotsList} />
          </div>
        </div>
        <div className="w-full lg:w-[28%]">
          {/* New Bot button */}
          <ManualTradeSection onSuccessAction={() => setRefreshBotsList(true)} />
        </div>
      </div>
    </div>
  )
}
