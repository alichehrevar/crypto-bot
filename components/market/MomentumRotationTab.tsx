import React from "react";

import MoversAndVolatility from "@/components/shared/charts/MoversAndVolatility";
import SectorPerformanceRanking from "@/components/shared/charts/SectorPerformanceRanking";
import ComparativeSectorRotation from "@/components/shared/charts/ComparativeSectorRotation";


// =====================================================================
// --- PAGE COMPONENT ---
// =====================================================================
export default function MomentumRotationTab() {

    return (
        <div className="flex flex-col lg:flex-row items-start justify-center w-full gap-2">
            <div className="flex flex-col gap-2 w-[45%]">
                <SectorPerformanceRanking />
                <ComparativeSectorRotation height={340} />
            </div>
            <div className="flex flex-col w-[55%]">
                <MoversAndVolatility />
            </div>
        </div>
    )
}
