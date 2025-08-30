import React, {useEffect, useState} from "react";

import EventCalendar, {CalendarData} from "@/components/shared/charts/EventCalendar";
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

const generateSentimentData = (): CalendarData => ({ events: [{ date: '2025-08-08', time: '14:00 UTC', event: 'US Non-Farm Payrolls (July)', impact: 'High', forecast: '180k', actual: '205k', isPast: true },{ date: '2025-08-12', time: '12:30 UTC', event: 'US CPI Data Release (July)', impact: 'High', forecast: '3.1%', actual: '3.2%', isPast: true },{ date: '2025-08-16', time: '16:00 UTC', event: 'Ethereum "Pectra" Upgrade Spec', impact: 'Medium', forecast: 'N/A', actual: 'TBD' },{ date: '2025-08-18', time: '10:00 UTC', event: 'Token Unlocks (APT)', impact: 'Low', forecast: '11.3M', actual: 'TBD' },{ date: '2025-08-20', time: '18:00 UTC', event: 'FOMC Meeting Minutes', impact: 'High', forecast: 'N/A', actual: 'TBD' },{ date: '2025-08-28', time: '18:30 UTC', event: 'US GDP Growth Rate (Q2 Final)', impact: 'Medium', forecast: '2.5%', actual: 'TBD' },]});

// =====================================================================
// --- PAGE COMPONENT ---
// =====================================================================
export default function LiquidityFlowTab() {

    const [netFlowData, setNetFlowData] = useState<NetFlowsData | null>(null);
    const [calendarData, setCalendarData] = useState<CalendarData | null>(null);

    useEffect(() => {
        setNetFlowData(generateLiquidityFlowsData());
        setCalendarData(generateSentimentData());
    }, [])

    return (
        <>
            <EventCalendar data={calendarData} />
            <ExchangeNetFlowCard data={netFlowData} />
        </>
    )
}
