import React from "react";

import PreLaunchHeroSection from "@/components/pre-launch/shared/PreLaunchHeroSection";
import LeaderboardContent from "@/components/pre-launch/leaderboard/LeaderboardContent";
import JoinCommunity from "@/components/pre-launch/layouts/partials/JoinCommunity";

export default function PreLunchPage () {

    return  (
        <>
            <PreLaunchHeroSection />
            <LeaderboardContent />
            <JoinCommunity className="mb-10" />
        </>
    )
}
