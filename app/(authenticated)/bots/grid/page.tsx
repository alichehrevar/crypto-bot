'use client'

import React, {useState} from "react";

import BotsListTable from "@/components/bots/BotsListTable";
import GridDeployBotSection from "@/components/bots/deploy/GridDeployBotSection";
import RealTimeCandlestickChart, { ChartGridConfig }  from "@/components/shared/charts/TradingViewLightweightChartWithGrids";
import MarketListWithSearch from "@/components/market/marketListWithSearch/MarketListWithSearch";
import CoinSummarySection from "@/components/shared/CoinSummarySection";
import {MarketListItem} from "@/types/MarketList";
import TradingViewLightweightChartGrid from "@/components/shared/charts/TradingViewLightweightChartGrid";

export default function TechnicalBotsPage() {
    const [refreshBotsList, setRefreshBotsList] = useState<boolean>(false)
    const [selectedSymbol, setSelectedSymbol] = useState<MarketListItem | null>(null);

    // 1. Set up the state for the grid configuration using useState
    // This is your "mock data" that the chart will display.
    const [gridConfig, setGridConfig] = useState<ChartGridConfig>({
        enabled: true,         // The grid should be visible
        lower: 2950,           // A realistic lower price for ETHUSDT
        upper: 3250,           // A realistic upper price for ETHUSDT
        grids: 50,             // The number of grid lines to draw
        mode: 'geometric',     // Use 'geometric' for percentage-based spacing
    });

    // 2. Create the callback function to handle updates from the chart
    // This function is crucial for making the draggable lines work.
    const handleGridConfigChange = (newConfig: Partial<ChartGridConfig>) => {
        // When the chart calls this function (e.g., after dragging a line),
        // we update our state with the new values.
        setGridConfig(prevConfig => ({
            ...prevConfig,
            ...newConfig,
        }));
    };

    return (
        <div className="w-full h-screen overflow-y-auto pt-8 relative px-5">
            <CoinSummarySection coinId={selectedSymbol?.id || "bitcoin"}/>
            <div className="w-full flex justify-center gap-2 mt-2">
                {/* --- Left Column --- */}
                <div className="w-full lg:w-[76%] self-stretch flex flex-col gap-2">

                    {/* Top part of Left Column */}
                    {/* CHANGED: Added a fixed height. Adjust h-[500px] as needed. */}
                    <div className="flex items-start justify-center gap-2 h-[600px]">
                        <div className="flex w-1/3 h-full ua-card">
                            <MarketListWithSearch onSymbolClickAction={(symbol: MarketListItem) => setSelectedSymbol(symbol)} />
                        </div>
                        <div className="w-2/3 h-full ua-card relative">
                            <TradingViewLightweightChartGrid
                                symbol={selectedSymbol?.symbol.replaceAll('/', '')}
                            />
                        </div>
                    </div>

                    {/* Bottom part of Left Column */}
                    {/* This part remains the same. It will grow to fill the available space. */}
                    <div className="grid grid-cols-1 flex-grow">
                        <BotsListTable listType="grid" refreshList={refreshBotsList}/>
                    </div>
                </div>

                {/* --- Right Column --- */}
                <div className="w-full lg:w-[24%] ua-card">
                    <GridDeployBotSection selectedSymbol={selectedSymbol} onSuccessAction={() => setRefreshBotsList(true)}/>
                </div>
            </div>
        </div>
    )
}
