'use client'

import React, {useState} from "react";

import BotsList from "@/components/bots/BotsList";
import ManualTradeSection from "@/components/bots/deploy/ManualTradeSection";
import {OrderBook} from "@/components/shared/OrderBook";
import CoinSummarySection from "@/components/shared/CoinSummarySection";
import RealTimeCandlestickChart from "@/components/shared/charts/TradingViewLightweightChart";
import AnalysisAndSymbolsList from "@/components/profile/manual-trading/AnalysisAndSymbolsList";
import {MarketListItem} from "@/types/MarketList";

export default function ManualTradingPage() {

    const [refreshBotsList, setRefreshBotsList] = useState<boolean>(false)
    const [selectedSymbol, setSelectedSymbol] = useState<MarketListItem | null>(null);

    return (
        <div className="w-full flex-1 h-screen overflow-y-auto pt-4 relative px-5 pb-5">
            {/*<PageTitleSection title="Manual Trading"/>*/}
            <div className="flex items-center justify-between w-full gap-6 backdrop-blur-sm rounded-xl min-h-[80px]">
                <CoinSummarySection coinId={selectedSymbol?.id || "bitcoin"} />
            </div>
            <div className=" w-full grid grid-cols-12 items-start justify-center gap-2 mt-2">
                <div className="col-span-3 h-full">
                    <AnalysisAndSymbolsList onSymbolClickAction={(symbol: MarketListItem) => setSelectedSymbol(symbol)} />
                </div>
                <div className="col-span-6 h-full">
                    <div className="flex items-center justify-center flex-col gap-2 h-full">
                        <div className="flex w-full h-[400px]">
                            <RealTimeCandlestickChart interval="1m" symbol="BTCUSDT" timeZone="local"/>
                        </div>
                        <div className="flex w-full h-full flex-1 technical-analysis">
                            <OrderBook/>
                        </div>
                    </div>
                </div>
                <div className="col-span-3">
                    {/* New Bot button */}
                    <ManualTradeSection selectedSymbol={selectedSymbol} onSuccessAction={() => setRefreshBotsList(true)}/>
                </div>
            </div>
            <div className="grid grid-cols-1 bg-dark-gray mt-2 rounded-lg py-6 px-3 h-[32.2svh]">
                <BotsList refreshList={refreshBotsList} showDeployButton={false} title="Trading Activities"/>
            </div>
        </div>
    )
}
