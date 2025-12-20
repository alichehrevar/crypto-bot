import React from "react";

import PerformanceChart from "@/components/pre-launch/ai-models/PerformanceChart";
import AICardsList from "@/components/pre-launch/ai-models/AICardsList";

export default function AILeaderboardContent () {
    return (
        <>
            <PerformanceChart />
            <AICardsList />
        </>
    )
}
