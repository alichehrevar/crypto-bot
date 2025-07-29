'use client'

import React, {useState} from "react";

import BotsList from "@/components/profile/bots/BotsList";
import TradingViewAdvancedChart from "@/components/shared/charts/TradingViewAdvancedChart";
import ManualTradeSection from "@/components/profile/bots/deploy/ManualTradeSection";
import {OrderBook} from "@/components/shared/OrderBook";
import TechnicalAnalysis from "@/components/shared/TechnicalAnalysis";
import PageTitleSection from "@/components/shared/ui/PageTitleSection";
import SymbolInfoWidget from "@/components/shared/SymbolInfoWidget";

export default function ManualTradingPage() {

    const [refreshBotsList, setRefreshBotsList] = useState<boolean>(false)

    return (
        <div className="w-full mt-4 relative px-5 pb-5">
            <PageTitleSection title="Manual Trading"/>
            <div className="flex items-center justify-between w-full gap-6 bg-dark-gray backdrop-blur-sm rounded-xl p-4 border border-gray-800/50 min-h-[80px] mt-5">
                <SymbolInfoWidget />
            </div>
            <div className=" w-full flex items-start justify-center gap-6 mt-6">
                <div className="w-full lg:w-[75%]">
                    {/*<MarketWatchChart />*/}
                    <div className="grid grid-cols-1 lg:grid-cols-[35%_64.5%] gap-4">
                        <TechnicalAnalysis/>
                        <div className="flex items-center justify-center flex-col gap-4">
                            <div className="flex w-full h-[400px]">
                                <TradingViewAdvancedChart/>
                            </div>
                            <div className="flex w-full flex-1 technical-analysis">
                                <OrderBook/>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="w-full lg:w-[25%] self-stretch">
                    {/* New Bot button */}
                    <ManualTradeSection onSuccessAction={() => setRefreshBotsList(true)}/>
                </div>
            </div>
            <div className="grid grid-cols-1 bg-dark-gray mt-4 rounded-2xl py-6 px-3 h-[32.2svh]">
                <BotsList refreshList={refreshBotsList}/>
            </div>
        </div>
    )
}
