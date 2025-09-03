import React from "react";
import {Tab, Tabs} from "@heroui/react";

import TechnicalAnalysis from "@/components/shared/TechnicalAnalysis";
import MarketListWithSearch from "@/components/market/marketListWithSearch/MarketListWithSearch";

export default function AnalysisAndSymbolsList() {
    return (
        <div className="flex flex-col bg-dark-gray rounded-lg py-3 w-full h-full">
            <Tabs
                aria-label="AnalysisAndSymbolsList"
                classNames={{
                    tabList: 'w-full px-2',
                    tab: 'pb-4 font-bold text-[14px] mb-1',
                    cursor: 'w-full',
                    panel: 'h-full'
                }}
                variant="underlined"
            >
                <Tab key="MarketListWithSearch" title="Search">
                    <MarketListWithSearch />
                </Tab>
                <Tab key="TechnicalAnalysis" title="Analysis">
                    <TechnicalAnalysis />
                </Tab>
            </Tabs>
        </div>
    )
}
