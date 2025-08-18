'use client'

import React, {useState} from "react";

import BotsList from "@/components/profile/bots/BotsList";
import TechnicalDeployBotSection from "@/components/profile/bots/deploy/TechnicalDeployBotSection";
import CoinSummarySection from "@/components/shared/CoinSummarySection";
import MarketListWithSearch from "@/components/MarketListWithSearch";
import RealTimeCandlestickChart from "@/components/shared/charts/TradingViewLightweightChart";
import AnalysisAndSymbolsList from "@/components/profile/manual-trading/AnalysisAndSymbolsList";

export default function TechnicalBotsPage() {

    const [refreshBotsList, setRefreshBotsList] = useState<boolean>(false)

    return (
        <div className="w-full mt-4 relative px-5 space-y-2">
            {/*<PageTitleSection imagePath="/images/profile/heikin_ashi-motion.png" title="Technical Bots" />*/}
            <CoinSummarySection coinId="btc-bitcoin"/>
            <div className=" w-full flex items-start justify-center gap-2 mt-2 lg:h-[900px]">
                <div className="w-full lg:w-[76%] self-stretch">
                    <div className="flex items-start justify-center gap-2 h-[65%]">
                        <div className="flex w-1/3 h-full">
                            {/* MarketList */}
                            <AnalysisAndSymbolsList/>
                        </div>
                        <div className="w-2/3 h-full">
                            <RealTimeCandlestickChart interval="1m" symbol="BTCUSDT" timeZone="local"/>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 bg-dark-gray bg-white mt-2 rounded-2xl py-6 px-3 h-[34%]">
                        <BotsList listType="indicator" refreshList={refreshBotsList}/>
                    </div>
                </div>
                <div className="w-full lg:w-[24%] lg:h-[900px]">
                    {/* New Bot button */}
                    <TechnicalDeployBotSection onSuccessAction={() => setRefreshBotsList(true)}/>
                </div>
            </div>
        </div>
    )
}
