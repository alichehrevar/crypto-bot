import React from "react";
import {Tab, Tabs} from "@heroui/react";

import TechnicalAnalysis from "@/components/shared/TechnicalAnalysis";
import MarketListWithSearch from "@/components/market/marketListWithSearch/MarketListWithSearch";
import {MarketListItem} from "@/types/MarketList";

interface AnalysisAndSymbolsListProps {
    onSymbolClickAction: (symbol: MarketListItem) => void;
}

export default function AnalysisAndSymbolsList({ onSymbolClickAction }: AnalysisAndSymbolsListProps) {
    return (
        <div className="py-3 w-full h-full">
            <Tabs
                aria-label="AnalysisAndSymbolsList"
                classNames={{
                    base: 'w-full',
                    tabList: 'w-[calc(100%-8px)] px-2 border-b border-gray-800 mx-auto',
                    tab: 'pb-4 font-bold text-[14px] -mb-1',
                    cursor: 'w-full',
                    panel: 'h-[96%] mt-2'
                }}
                variant="underlined"
            >
                <Tab key="MarketListWithSearch" title="Search">
                    <MarketListWithSearch onSymbolClickAction={onSymbolClickAction} />
                </Tab>
                <Tab key="TechnicalAnalysis" title="Analysis">
                    <TechnicalAnalysis />
                </Tab>
            </Tabs>
        </div>
    )
}
