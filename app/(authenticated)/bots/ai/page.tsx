'use client'

import React from "react";

import RealTimeCandlestickChart from "@/components/shared/charts/TradingViewLightweightChart";
import CoinSummarySection from "@/components/shared/CoinSummarySection";
import CreatorsHubPanel from "@/components/shared/CreatorsHubPanel";
import RiskManagementPanel from "@/components/shared/RiskManagementPanel";
import StrategyPanel from "@/components/shared/StrategyPanel";


export default function AiBotsPage() {

    return (
        <div className="w-full mt-4 relative px-5">
            <CoinSummarySection coinId="btc-bitcoin"/>
            <div className=" w-full flex items-start justify-center gap-2 mt-2">
                <div className="flex flex-col gap-2 lg:w-[60%]">
                    <div className="w-full lg:h-[500px]">
                        <RealTimeCandlestickChart interval="1m" symbol="BTCUSDT" timeZone="local"/>
                    </div>
                    <StrategyPanel />
                </div>
                <div className="w-full flex flex-col gap-2 lg:w-[40%]">
                    <CreatorsHubPanel />
                    <RiskManagementPanel />
                </div>
            </div>
        </div>
    )
}
