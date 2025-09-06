import React from "react";

import SummaryPieChartWithDetails from "@/components/portfolio/assets/SummaryPieChartWithDetails";
import AssetsTable from "@/components/portfolio/assets/AssetsTable";

export default function DetailedViewOfHolding() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:items-start">
            <div className="col-span-7">
                <AssetsTable />
            </div>
            <div className="col-span-5 h-full">
                <div className="relative h-full">
                    <div className="sticky top-0">
                        <SummaryPieChartWithDetails />
                    </div>
                </div>
            </div>
        </div>
    )
}
