'use client';

import React from 'react';
import {Tab, Tabs} from "@heroui/react";

import SummaryTab from "@/components/market/SummaryTab";
import MomentumRotationTab from "@/components/market/MomentumRotationTab";
import LiquidityFlowTab from "@/components/market/LiquidityFlowTab";
import SentimentEventsTab from "@/components/market/SentimentEventsTab";

// =====================================================================
// --- PAGE COMPONENT ---
// =====================================================================

export default function Page() {
    return (
        <div className="container mx-auto px-2 lg:px-4 py-8">
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
                <Tab key="summary" title="Summary">
                    <SummaryTab />
                </Tab>
                <Tab key="momentum-rotation" title="Momentum & Rotation">
                    <MomentumRotationTab />
                </Tab>
                <Tab key="liquidity-flow" title="Liquidity & Flow">
                    <LiquidityFlowTab />
                </Tab>
                <Tab key="sentiment-events" title="Sentiment & Events">
                    <SentimentEventsTab />
                </Tab>
            </Tabs>
        </div>
    );
}
