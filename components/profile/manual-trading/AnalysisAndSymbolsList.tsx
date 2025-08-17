import React from "react";
import {Tab, Tabs} from "@heroui/react";

import TechnicalAnalysis from "@/components/shared/TechnicalAnalysis";
import MarketListWithSearch from "@/components/MarketListWithSearch";

export default function AnalysisAndSymbolsList() {
    return (
        <div className="grid grid-cols-1 bg-dark-gray rounded-2xl py-3 w-full">
            <Tabs
                aria-label="AnalysisAndSymbolsList"
                classNames={{
                    tabList: 'w-full px-2',
                    tab: 'pb-4 font-bold text-[14px] mb-1',
                    cursor: 'w-full'
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
