'use client'

import React, {useState} from "react";

import BotsList from "@/components/bots/BotsList";
import GridDeployBotSection from "@/components/bots/deploy/GridDeployBotSection";
import RealTimeCandlestickChart from "@/components/shared/charts/TradingViewLightweightChart";
import MarketListWithSearch from "@/components/market/marketListWithSearch/MarketListWithSearch";
import CoinSummarySection from "@/components/shared/CoinSummarySection";
import {MarketListItem} from "@/types/MarketList";


export default function TechnicalBotsPage() {

    const [refreshBotsList, setRefreshBotsList] = useState<boolean>(false)
    const [selectedSymbol, setSelectedSymbol] = useState<MarketListItem | null>(null);

    return (
        <div className="w-full h-screen overflow-y-auto pt-8 relative px-5">
            <CoinSummarySection coinId={selectedSymbol?.id || "btc-bitcoin"}/>
            <div className=" w-full flex items-start justify-center gap-2 mt-2 lg:h-[900px]">
                <div className="w-full lg:w-[76%] self-stretch">
                    <div className="flex items-start justify-center gap-2 h-[65%]">
                        <div className="flex w-1/3 h-full">
                            {/* MarketList */}
                            <MarketListWithSearch onSymbolClickAction={(symbol: MarketListItem) => setSelectedSymbol(symbol)} />
                        </div>
                        <div className="w-2/3 h-full">
                            <RealTimeCandlestickChart interval="1m" symbol="BTCUSDT" timeZone="local"/>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 bg-dark-gray bg-white mt-2 rounded-lg py-6 px-3 h-[34%]">
                        <BotsList listType="grid" refreshList={refreshBotsList}/>
                    </div>
                </div>
                <div className="w-full lg:w-[24%] lg:h-[900px]">
                    {/* New Bot button */}
                    <GridDeployBotSection selectedSymbol={selectedSymbol} onSuccessAction={() => setRefreshBotsList(true)}/>
                </div>
            </div>
        </div>
    )
}
