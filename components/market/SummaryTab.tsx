import React from "react";

import DailyMarketAnalysis from "@/components/shared/DailyMarketAnalysis";
import TopMovers from "@/components/profile/dashboard/TopMovers";
import MarketAnomalyFeed from "@/components/shared/MarketAnomalyFeed";
import SentimentGaugeWidget from "@/components/shared/SentimentGaugeWidget";


export default function SummaryTab() {
    return (
        <div className="flex items-center justify-center flex-col gap-2 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 w-full">
                <div className="col-span-7">
                    <DailyMarketAnalysis />
                </div>
                <div className="col-span-5">
                    <div
                        className="flex items-center justify-start flex-col bg-dark-gray rounded-lg py-6 px-3 gap-4 h-full min-h-[250px]">
                        <TopMovers/>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 w-full">
                <div className="col-span-5">
                    <SentimentGaugeWidget />
                </div>
                <div className="col-span-7">
                    <MarketAnomalyFeed />
                </div>
            </div>
        </div>
    )
}
