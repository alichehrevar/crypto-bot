import React from "react";

import SummaryPieChartWithDetails from "@/components/portfolio/assets/SummaryPieChartWithDetails";
import AssetsTable from "@/components/portfolio/assets/AssetsTable";
import AssetSummary from "@/components/profile/dashboard/assetSummary";

export default function DetailedViewOfHolding() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
            <div className="col-span-7">
                <AssetsTable />
            </div>
            <div className="col-span-5">
                <SummaryPieChartWithDetails />
            </div>
        </div>
    )
}
