import React from "react";

import DarkSelect from "@/components/pre-launch/shared/DarkSelect";
import LeaderboardSearchBox from "@/components/pre-launch/leaderboard/tabs/algos/LeaderboardSearchBox";
import QuantumLeadCardsList from "@/components/pre-launch/leaderboard/tabs/algos/QuantumLeadCartsList";

export default function LeaderboardAlgosTab () {
    return (
        <>
            <div className="flex items-center justify-between w-full">
                <DarkSelect title="Sort by" />
                <LeaderboardSearchBox />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 mt-8">
                <QuantumLeadCardsList />
            </div>
        </>
    )
}
