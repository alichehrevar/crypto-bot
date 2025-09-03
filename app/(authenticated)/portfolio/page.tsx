'use client'

import React from "react";
import {Tabs, Tab} from "@heroui/react";

import DetailedViewOfHolding from "@/components/portfolio/DetailedViewOfHolding";
import OpenPositionsTab from "@/components/portfolio/OpenPositionsTab";
import PnLTab from "@/components/portfolio/PnLTab";
import BotsList from "@/components/bots/BotsList";
import AssetSummary from "@/components/profile/dashboard/assetSummary";

export default function HoldingDetailsPage() {

    return (
        <section className="container px-2 lg:px-4 mt-8 mx-auto space-y-4">
            <AssetSummary/>
            <Tabs
                aria-label="Tabs variants"
                classNames={{
                    base: 'w-full px-1',
                    tabList: 'w-full mx-auto border-b-1 border-default-100',
                    tab: 'h-10 pb-4 font-bold text-[14px]',
                    panel: "w-full grid grid-cols-1 gap-4 mt-4"
                }}
                variant="underlined"
            >
                <Tab key="summary" title="Detailed View of Holding">
                    <DetailedViewOfHolding />
                </Tab>
                <Tab key="momentum-rotation" title="Open Positions">
                    <OpenPositionsTab />
                </Tab>
                <Tab key="liquidity-flow" title="PnL">
                    <PnLTab />
                </Tab>
                <Tab key="sentiment-events" title="Trade History">
                    <div className="bg-dark-gray rounded-lg py-4"><BotsList active={false} showTitle={false} /></div>
                </Tab>
            </Tabs>
        </section>
    )
}
