'use client'

import React, {useState} from "react";

import BotsListTable from "@/components/bots/BotsListTable";
import TechnicalDeployBotSection from "@/components/bots/deploy/TechnicalDeployBotSection";
import CoinSummarySection from "@/components/shared/CoinSummarySection";
import RealTimeCandlestickChart from "@/components/shared/charts/TradingViewLightweightChart";
import AnalysisAndSymbolsList from "@/components/profile/manual-trading/AnalysisAndSymbolsList";
import {MarketListItem} from "@/types/MarketList";

export default function TechnicalBotsPage() {

    const [refreshBotsList, setRefreshBotsList] = useState<boolean>(false)
    const [selectedSymbol, setSelectedSymbol] = useState<MarketListItem | null>(null);

    return (
        <div className="w-full h-screen overflow-y-auto pt-8 relative px-5 space-y-2">
            <CoinSummarySection coinId={selectedSymbol?.id || "bitcoin"} />
            <div className=" w-full flex items-start justify-center gap-2 mt-2 lg:h-[900px]">
                <div className="w-full lg:w-[76%] self-stretch">
                    <div className="flex items-start justify-center gap-2 h-[65%]">
                        <div className="flex w-1/3 h-full ua-card">
                            {/* MarketList */}
                            <AnalysisAndSymbolsList onSymbolClickAction={(symbol: MarketListItem) => setSelectedSymbol(symbol)} />
                        </div>
                        <div className="w-2/3 h-full ua-card">
                            <RealTimeCandlestickChart interval="1m" symbol={selectedSymbol} timeZone="local"/>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 mt-2 rounded-lg h-[34%]">
                        <BotsListTable listType="indicator" refreshList={refreshBotsList}/>
                    </div>
                </div>
                <div className="w-full lg:w-[24%] lg:h-[900px] ua-card">
                    {/* New Bot button */}
                    <TechnicalDeployBotSection selectedSymbol={selectedSymbol?.id} onSuccessAction={() => setRefreshBotsList(true)}/>
                </div>
            </div>
        </div>
    )
}
