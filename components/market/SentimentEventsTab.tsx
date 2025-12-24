import React from "react";

import UpcomingListings from "@/components/shared/charts/UpcomingListings";
import TrendingTopicsTable from "@/components/shared/charts/TrendingTopicsTable";
import EventCalendar from "@/components/shared/charts/EventCalendar";


// =====================================================================
// --- PAGE COMPONENT ---
// =====================================================================
export default function SentimentEventsTab() {
    return (
        <>
            <EventCalendar />
            <UpcomingListings />
            <TrendingTopicsTable />
        </>
    )
}
