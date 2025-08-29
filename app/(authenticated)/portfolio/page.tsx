'use client'

import React, {useState} from "react";

import Tabs from "@/components/shared/ui/Tabs";
import DetailedViewOfHolding from "@/components/portfolio/DetailedViewOfHolding";
import OpenPositionsTab from "@/components/portfolio/OpenPositionsTab";
import PnLTab from "@/components/portfolio/PnLTab";

const tabs = [
    'Detailed View of Holding',
    'Open Positions',
    'PnL',
    'Trade History',
]

export default function HoldingDetailsPage() {

    const [activeTab, setActiveTab] = useState(tabs[0]);

    return (
        <section className="container px-2 lg:px-4 mt-8 mx-auto space-y-4">
            <Tabs activeTab={activeTab} setActiveTab={setActiveTab} tabs={tabs}/>
            {activeTab === tabs[0] && <DetailedViewOfHolding />}
            {activeTab === tabs[1] && <OpenPositionsTab />}
            {activeTab === tabs[2] && <PnLTab />}
        </section>
    )
}
