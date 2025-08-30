import React, {useEffect, useState} from "react";

import EventCalendar from "@/components/shared/charts/EventCalendar";
import ExchangeNetFlowCard from "@/components/shared/charts/ExchangeNetFlowCard";

// =====================================================================
// --- TYPE DEFINITIONS ---
// =====================================================================
interface NetFlowHistoryItem { day: string; inflow: number; outflow: number; totalNetFlow: number; stablecoinFlow: number; exchangeFlow: number; txCount: number; sevenDayMA: number | null; }
interface NetFlowsData { netFlows: { history: NetFlowHistoryItem[]; }; }

// =====================================================================
// --- MOCK DATA GENERATION ---
// =====================================================================
const random = (min: number, max: number): number => Math.random() * (max - min) + min;
const generateLiquidityFlowsData = (): NetFlowsData => {
    const baseHistory = Array.from({ length: 17 }, (_, i) => { const date = new Date();

        date.setDate(date.getDate() - (16 - i)); const inflow = random(100, 800); const outflow = random(100, 800) * -1;

        return { day: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), inflow, outflow, totalNetFlow: inflow + outflow, stablecoinFlow: random(-500, 500), exchangeFlow: random(-200, 200), txCount: Math.floor(random(2000, 20000)), }; });
    const netFlowsHistory: NetFlowHistoryItem[] = baseHistory.map((item, index, arr) => { if (index < 6) return { ...item, sevenDayMA: null }; const sevenDaySlice = arr.slice(index - 6, index + 1); const sum = sevenDaySlice.reduce((acc, curr) => acc + curr.totalNetFlow, 0);

        return { ...item, sevenDayMA: sum / 7 }; }).slice(7);

    return { netFlows: { history: netFlowsHistory } };
};


// =====================================================================
// --- PAGE COMPONENT ---
// =====================================================================
export default function LiquidityFlowTab() {

    const [netFlowData, setNetFlowData] = useState<NetFlowsData | null>(null);

    useEffect(() => {
        setNetFlowData(generateLiquidityFlowsData());
    }, [])

    return (
        <>
            <EventCalendar />
            <ExchangeNetFlowCard data={netFlowData} />
        </>
    )
}
