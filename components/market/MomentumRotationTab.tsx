import React from "react";

import MoversAndVolatility from "@/components/shared/charts/MoversAndVolatility";
import SectorPerformanceRanking from "@/components/shared/charts/SectorPerformanceRanking";
import ComparativeSectorRotation from "@/components/shared/charts/ComparativeSectorRotation";


// =====================================================================
// --- PAGE COMPONENT ---
// =====================================================================
export default function MomentumRotationTab() {

    return (
        <div className="grid grid-cols-1 lg:grid-cols-9 gap-2">
            <div className="lg:col-span-4 flex flex-col gap-2">
                <SectorPerformanceRanking />
                <ComparativeSectorRotation />
            </div>
            <div className="lg:col-span-5">
                <MoversAndVolatility className="h-[400px] lg:h-[838px]" />
            </div>
        </div>
    )
}
