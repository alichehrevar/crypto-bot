import React from "react";

import PreLaunchHeroSection from "@/components/pre-launch/shared/PreLaunchHeroSection";
import QuantumLeadCard from "@/components/pre-launch/leaderboard/QuantumLeadCard";
import DarkSelect from "@/components/pre-launch/shared/DarkSelect";
import LeaderBoardSearchBox from "@/components/pre-launch/leaderboard/LeaderBoardSearchBox";

export default function PreLunchPage () {
    return  (
        <>
            <PreLaunchHeroSection />
            <div className="bg-[#0D0D0D] w-full my-16 py-16">
                <div className="container pre-launch-container mx-auto px-2 md:px-3 lg:px-4">
                    <div className="flex items-center justify-between w-full">
                        <DarkSelect title="Sort by" />
                        <LeaderBoardSearchBox />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 mt-8">
                        {[...Array(21)].map((_, index) => (
                            <QuantumLeadCard key={index} />
                        ))}
                    </div>
                </div>
            </div>
        </>
    )
}
