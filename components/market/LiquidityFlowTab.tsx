import React from "react";

import EventCalendar from "@/components/shared/charts/EventCalendar";
import ExchangeNetFlowCard from "@/components/shared/charts/ExchangeNetFlowCard";

// =====================================================================
// --- PAGE COMPONENT ---
// =====================================================================
export default function LiquidityFlowTab() {

    return (
        <>
            <EventCalendar />
            <ExchangeNetFlowCard />
        </>
    )
}
