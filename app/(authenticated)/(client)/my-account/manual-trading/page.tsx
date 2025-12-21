'use client'

import React, {useState} from "react";

import BotsListTable from "@/components/bots/BotsListTable";
import ManualTradeSection from "@/components/bots/deploy/ManualTradeSection";
import {OrderBook} from "@/components/shared/OrderBook";
import CoinSummarySection from "@/components/shared/CoinSummarySection";
import AnalysisAndSymbolsList from "@/components/profile/manual-trading/AnalysisAndSymbolsList";
import {MarketListItem} from "@/types/MarketList";
import TradingViewLightweightChartGrid from "@/components/shared/charts/TradingViewLightweightChartGrid";

export default function ManualTradingPage() {

    const [refreshBotsList, setRefreshBotsList] = useState<boolean>(false)
    const [selectedSymbol, setSelectedSymbol] = useState<MarketListItem | null>(null);

    return (
        <div className="container no-scrollbar mx-auto w-full h-screen overflow-y-auto pt-8 relative px-5 space-y-2">
            <CoinSummarySection coinId={selectedSymbol?.id || "68edf9f3ae9ad504e3c7f799"} />
            <div className="w-full grid grid-cols-4 gap-2">
                <div className="ua-card">
                    <AnalysisAndSymbolsList onSymbolClickAction={(symbol: MarketListItem) => setSelectedSymbol(symbol)} />
                </div>
                <div className="col-span-2 space-y-2">
                    <div className="h-[400px]">
                        <TradingViewLightweightChartGrid
                            isGrid={false}
                            symbol={selectedSymbol?.symbol.replaceAll('/', '')}
                        />
                    </div>
                    <div className="h-[300px] ua-card">
                        <OrderBook/>
                    </div>
                </div>
                <ManualTradeSection selectedSymbol={selectedSymbol} onSuccessAction={() => setRefreshBotsList(true)}/>
            </div>
            <BotsListTable refreshList={refreshBotsList} showDeployButton={false} title="Trading Activities"/>
        </div>
    )
}
