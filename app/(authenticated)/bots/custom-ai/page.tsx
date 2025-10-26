'use client'

import React from "react";

import RealTimeCandlestickChart from "@/components/shared/charts/TradingViewLightweightChart";
import CoinSummarySection from "@/components/shared/CoinSummarySection";
import CreatorsHubPanel from "@/components/shared/CreatorsHubPanel";
import RiskManagementPanel from "@/components/shared/RiskManagementPanel";
import StrategyPanel from "@/components/shared/StrategyPanel";
import AIStrategyGenerator from "@/components/shared/AIStrategyGenerator";
import {MarketListItem} from "@/types/MarketList";


export default function AiBotsPage() {

    const symbol = {
        id: "1`",
        symbol: "BTC/USDT",
        category: "Perpetual",
        broker: "OKX",
        volume: 291999990000000,
        lastPrice: 2.388e-8,
        dailyChange: -0.12547051442911306,
        isFavorite: true
    } as MarketListItem

    return (
        <div className="container no-scrollbar mx-auto w-full h-screen overflow-y-auto pt-8 relative px-5">
            <CoinSummarySection coinId={"68edf9f3ae9ad504e3c7f799"} />
            <div className="w-full grid grid-cols-12 gap-2 mt-2">
                <div className="flex flex-col gap-2 lg:col-span-7">
                    <div className="w-full h-[500px]">
                        <RealTimeCandlestickChart interval="1m" symbol={symbol} timeZone="local"/>
                    </div>
                    <AIStrategyGenerator />
                </div>
                <div className="w-full flex flex-col gap-2 lg:col-span-5">
                    <CreatorsHubPanel />
                    <RiskManagementPanel />
                    <StrategyPanel />
                </div>
            </div>
        </div>
    )
}
